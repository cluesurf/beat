// Play a song. Loops + watches by default.
//
//   pnpm cli play                            # default song (example)
//   pnpm cli play example --once             # one pass
//   pnpm cli play example --restart          # cut current loop on save
//   pnpm cli play example --pattern verse    # solo one pattern, looped
//   pnpm cli play tool/grudge --from 7       # start at bar 7
//   pnpm cli play tool/grudge --from 7 --to 10  # play bars 7-10 only
//   pnpm cli play tool/grudge --silent-bars  # don't log bar progress

import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { existsSync, readFileSync, watch } from 'node:fs'
import easymidi from 'easymidi'
import { debounce } from 'lodash-es'
import type { Argv, CommandModule } from 'yargs'

import { openDrumOutput } from '@/code/output'
import { sendHit } from '@/code/hit'
import { expandSong, type Hit, type Song } from '@/code/song'
import { DRUM_CHANNEL } from '@/code/note'
import { humanize, HUMANIZE, type HumanizePreset } from '@/code/humanize'
import { expandArrangement, type BarInfo } from '@/code/arrangement'
import { parse as parseTab } from '@/code/tab/index'

type Args = {
  song: string
  once: boolean
  restart: boolean
  pattern?: string
  humanize?: string
  seed?: number
  from?: number
  to?: number
  silentBars: boolean
  format: string
}

// Format → file to look for. `auto` falls back across all formats.
const FORMAT_FILES: Record<string, string[]> = {
  auto: ['text.beat', 'index.ts', 'code.ts', 'data.ts', 'text.ts'],
  beat: ['text.beat'],
  code: ['code.ts'],
  data: ['data.ts'],
  text: ['text.ts'],
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const playCommand: CommandModule<unknown, Args> = {
  command: 'play [song]',
  describe: 'Play a song from beat/base/song/<name>/index.ts',
  builder: (y: Argv): Argv<Args> =>
    y
      .positional('song', {
        type: 'string',
        default: 'example',
        describe: 'Song folder name under base/song/',
      })
      .option('once', {
        type: 'boolean',
        default: false,
        describe: 'Play once and exit (no loop, no watch)',
      })
      .option('restart', {
        type: 'boolean',
        default: false,
        describe: 'Cut current loop on save instead of finishing it',
      })
      .option('pattern', {
        type: 'string',
        describe: 'Solo a single pattern (looped forever)',
      })
      .option('humanize', {
        type: 'string',
        choices: Object.keys(HUMANIZE),
        describe: 'Apply timing+velocity jitter (overrides song setting)',
      })
      .option('seed', {
        type: 'number',
        describe: 'Reproducible humanization seed',
      })
      .option('from', {
        type: 'number',
        describe: 'Start at this bar (1-indexed)',
      })
      .option('to', {
        type: 'number',
        describe: 'Stop after this bar (1-indexed, inclusive)',
      })
      .option('silentBars', {
        type: 'boolean',
        default: false,
        describe: 'Suppress the bar-position log',
      })
      .option('format', {
        type: 'string',
        choices: Object.keys(FORMAT_FILES),
        default: 'auto',
        describe:
          'Which song file to load: beat (text.beat), code (code.ts), data (data.ts), text (text.ts), auto',
      }) as Argv<Args>,
  handler: async args => {
    await runPlay(args)
  },
}

async function runPlay(args: Args): Promise<void> {
  const watchMode = !args.once
  const songDir = resolve(__dirname, `../../test/${args.song}`)
  const candidates = FORMAT_FILES[args.format] ?? FORMAT_FILES.auto!
  const found = candidates
    .map(f => resolve(songDir, f))
    .find(p => existsSync(p))
  if (!found) {
    throw new Error(
      `No song file found in ${songDir} ` +
        `(looked for: ${candidates.join(', ')})`,
    )
  }
  const songPath: string = found

  async function loadSong(): Promise<Song> {
    let song: Song
    if (songPath.endsWith('.beat')) {
      const text = readFileSync(songPath, 'utf8')
      const result = parseTab(text)
      for (const e of result.errors) {
        console.warn(`[beat] tab ${e.severity}: ${e.message}`)
      }
      song = result.song
    } else {
      // ESM caches imports by URL — bust with a query string.
      const url = pathToFileURL(songPath).href + `?t=${Date.now()}`
      const mod = (await import(url)) as { default: Song }
      song = mod.default
    }

    if (args.pattern) {
      const matched = song.patterns.find(p => p.name === args.pattern)
      if (!matched) {
        throw new Error(
          `--pattern "${args.pattern}" not found in "${song.name}". ` +
            `Available: ${song.patterns.map(p => p.name).join(', ')}`,
        )
      }
      song = { ...song, arrangement: [{ pattern: args.pattern }] }
    }
    return song
  }

  const output = openDrumOutput()
  let timers: NodeJS.Timeout[] = []
  const sounding = new Set<number>()

  function patchedSendHit(hit: Hit): void {
    sounding.add(hit.note)
    sendHit(output, hit)
    setTimeout(
      () => sounding.delete(hit.note),
      (hit.durationMs ?? 120) + 50,
    )
  }

  function stop(): void {
    for (const t of timers) clearTimeout(t)
    timers = []
    for (let ch = 0; ch < 16; ch++) {
      output.send('cc', {
        controller: 123,
        value: 0,
        channel: ch as easymidi.Channel,
      })
    }
    for (const note of sounding) {
      output.send('noteoff', {
        note,
        velocity: 0,
        channel: DRUM_CHANNEL as easymidi.Channel,
      })
    }
    sounding.clear()
  }

  function schedulePass(song: Song): Promise<void> {
    const raw = expandSong(song)
    // CLI flag wins; otherwise fall back to whatever the song
    // declared. `humanize: 'off'` from the CLI explicitly
    // disables a song's setting.
    const humanizeConfig =
      args.humanize !== undefined
        ? HUMANIZE[args.humanize as HumanizePreset]
        : song.humanize
    const allHits = humanizeConfig
      ? humanize(raw, { ...humanizeConfig, seed: args.seed ?? humanizeConfig.seed })
      : raw

    const allBars = expandArrangement(song)

    // --from / --to slice the arrangement by bar number. Compute
    // the start/end beat window from the chosen bars, filter the
    // hits to that window, and shift everything to start at 0.
    const fromBar = args.from ?? 1
    const toBar = args.to ?? allBars.length
    if (fromBar < 1 || fromBar > allBars.length) {
      throw new Error(
        `--from ${fromBar} out of range (1..${allBars.length})`,
      )
    }
    if (toBar < fromBar || toBar > allBars.length) {
      throw new Error(
        `--to ${toBar} out of range (${fromBar}..${allBars.length})`,
      )
    }
    const startBeat = allBars[fromBar - 1]!.startBeat
    const endBar = allBars[toBar - 1]!
    const endBeat = endBar.startBeat + endBar.beats
    const bars = allBars
      .slice(fromBar - 1, toBar)
      .map(b => ({ ...b, startBeat: b.startBeat - startBeat }))
    const hits = allHits
      .filter(h => h.beat >= startBeat && h.beat < endBeat)
      .map(h => ({ ...h, beat: h.beat - startBeat }))

    const msPerBeat = 60_000 / song.bpm
    const lastBeat = Math.max(0, ...hits.map(h => h.beat))
    const totalMs = lastBeat * msPerBeat + 500

    const tag = args.pattern
      ? `${song.name} [solo: ${args.pattern}]`
      : song.name
    const humanizeTag = args.humanize ?? (song.humanize ? 'song-default' : 'off')
    const rangeTag =
      fromBar === 1 && toBar === allBars.length
        ? `${allBars.length} bars`
        : `bars ${fromBar}-${toBar} of ${allBars.length}`
    console.log(
      `[beat] playing "${tag}" @ ${song.bpm} BPM — ` +
        `${hits.length} hits, ${rangeTag}, ${(totalMs / 1000).toFixed(1)}s ` +
        `[humanize: ${humanizeTag}]`,
    )

    for (const hit of hits) {
      // Humanization can produce slightly negative beats — clamp
      // to 0 so setTimeout doesn't get a negative delay.
      const delay = Math.max(0, hit.beat * msPerBeat)
      timers.push(setTimeout(() => patchedSendHit(hit), delay))
    }

    if (!args.silentBars) {
      scheduleBarLog(bars, msPerBeat, allBars.length)
    }

    return new Promise(done => {
      timers.push(setTimeout(() => done(), totalMs))
    })
  }

  function scheduleBarLog(
    bars: BarInfo[],
    msPerBeat: number,
    totalBarCount: number,
  ): void {
    let lastSection = -1
    for (const bar of bars) {
      const delay = Math.max(0, bar.startBeat * msPerBeat)
      timers.push(
        setTimeout(() => {
          const sectionChanged = bar.sectionIndex !== lastSection
          lastSection = bar.sectionIndex
          const marker = sectionChanged ? '━' : '·'
          console.log(
            `  ${marker} bar ${String(bar.totalBar).padStart(3)}/` +
              `${totalBarCount}  ${bar.patternName}` +
              (bar.barInSection > 1 ? ` (${bar.barInSection})` : ''),
          )
        }, delay),
      )
    }
  }

  let dirty = false

  const onChange = debounce((filename: string | null) => {
    console.log(`[beat] changed: ${filename ?? '(unknown)'}`)
    dirty = true
    if (args.restart) stop()
  }, 100)

  if (watchMode) {
    watch(songDir, { recursive: true }, (_event, filename) => {
      onChange(filename ? String(filename) : null)
    })
    const songDirShort = relative(process.cwd(), songDir) || songDir
    console.log(
      `[beat] watching ${songDirShort} ` +
        `(${
          args.restart ? 'cut + restart' : 'finish loop, then reload'
        })`,
    )
  }

  process.on('SIGINT', () => {
    console.log('\n[beat] stopping')
    stop()
    output.close()
    process.exit(0)
  })

  let song = await loadSong()
  while (true) {
    if (dirty) {
      dirty = false
      try {
        song = await loadSong()
        console.log(`[beat] reloaded "${args.song}"`)
      } catch (err) {
        console.error('[beat] reload failed:', err)
      }
    }
    await schedulePass(song)
    if (!watchMode) break
  }

  stop()
  output.close()
}
