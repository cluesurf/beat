// Play a song. Loops + watches by default.
//
//   pnpm cli play                            # default song (example)
//   pnpm cli play example --once             # one pass
//   pnpm cli play example --restart          # cut current loop on save
//   pnpm cli play example --pattern verse    # solo one pattern, looped

import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { watch } from 'node:fs'
import easymidi from 'easymidi'
import { debounce } from 'lodash-es'
import type { Argv, CommandModule } from 'yargs'

import { openDrumOutput } from '@/code/output'
import { sendHit } from '@/code/hit'
import { expandSong, type Hit, type Song } from '@/code/song'
import { DRUM_CHANNEL } from '@/code/note'

type Args = {
  song: string
  once: boolean
  restart: boolean
  pattern?: string
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
      }) as Argv<Args>,
  handler: async args => {
    await runPlay(args)
  },
}

async function runPlay(args: Args): Promise<void> {
  const watchMode = !args.once
  const songDir = resolve(__dirname, `../../base/song/${args.song}`)
  const songPath = resolve(songDir, 'index.ts')

  // ESM caches imports by URL. Append a query string so each
  // re-import sees a "different" URL and re-parses the file.
  // NOTE: only the index.ts module is busted — sibling files
  // imported statically stay cached. Use dynamic imports inside
  // index.ts (`await import('./verse?t=' + Date.now())`) to make
  // hot-reload cascade through pattern files.
  async function loadSong(): Promise<Song> {
    const url = pathToFileURL(songPath).href + `?t=${Date.now()}`
    const mod = (await import(url)) as { default: Song }
    let song = mod.default
    if (args.pattern) {
      const found = song.patterns.find(p => p.name === args.pattern)
      if (!found) {
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
    const hits = expandSong(song)
    const msPerBeat = 60_000 / song.bpm
    const lastBeat = Math.max(0, ...hits.map(h => h.beat))
    const totalMs = lastBeat * msPerBeat + 500

    const tag = args.pattern
      ? `${song.name} [solo: ${args.pattern}]`
      : song.name
    console.log(
      `[beat] playing "${tag}" @ ${song.bpm} BPM — ` +
        `${hits.length} hits over ${(totalMs / 1000).toFixed(1)}s`,
    )

    for (const hit of hits) {
      timers.push(
        setTimeout(() => patchedSendHit(hit), hit.beat * msPerBeat),
      )
    }

    return new Promise(done => {
      timers.push(setTimeout(() => done(), totalMs))
    })
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
    console.log(
      `[beat] watching ${songDir} ` +
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
