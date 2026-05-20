// Play a song. Loops + watches by default.
//
//   pnpm cli play                            # default song (example)
//   pnpm cli play example --once             # one pass
//   pnpm cli play example --restart          # cut current loop on save
//   pnpm cli play example --pattern verse    # solo one pattern, looped
//   pnpm cli play tool/grudge --from 7       # start at bar 7
//   pnpm cli play tool/grudge --from 7 --to 10  # play bars 7-10 only
//   pnpm cli play tool/grudge --loop 3..6    # loop bars 3-6 forever
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
import AbletonLink from 'abletonlink'

type Args = {
  song: string
  once: boolean
  restart: boolean
  pattern?: string
  humanize?: string
  seed?: number
  from?: number
  to?: number
  loop?: string
  part?: string
  measure?: number
  silentBars: boolean
  format: string
  sync: 'internal' | 'master' | 'link'
  quantum: number
  offsetMs: number
}

// 24 MIDI clock pulses per quarter note. Standard, non-negotiable.
const PPQN = 24

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
      .option('loop', {
        type: 'string',
        describe:
          'Loop a single bar (e.g. --loop 3) or a range, inclusive ' +
          'both ends (e.g. --loop 1..2 for bars 1 and 2).',
      })
      .option('part', {
        type: 'string',
        describe:
          'Play just this section (e.g. "bridge-2"). Pairs with --measure to start mid-section.',
      })
      .option('measure', {
        type: 'number',
        describe:
          'Used with --part: start at the Nth measure of that part (1-indexed).',
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
      })
      .option('sync', {
        type: 'string',
        choices: ['internal', 'master', 'link'] as const,
        default: 'internal' as const,
        describe:
          'internal: setTimeout. master: emit 24 PPQN MIDI clock (does NOT work with Logic Pro 11 — use link). link: Ableton Link peer (Logic Pro: Sync Mode → Ableton Link).',
      })
      .option('quantum', {
        type: 'number',
        default: 4,
        describe:
          'Ableton Link quantum (beats per bar). 4 for 4/4, 7 for 7/8, etc. Used with --sync link.',
      })
      .option('offsetMs', {
        type: 'number',
        default: 0,
        describe:
          'Shift drum hits earlier by N ms to compensate for IAC + sampler latency vs Logic. Dial in until drums lock with guitar audio. Used with --sync link.',
      }) as Argv<Args>,
  handler: async args => {
    await runPlay(args)
  },
}

function applyLoopFlag(args: Args): void {
  if (!args.loop) return

  // Range form: `--loop N..M` is inclusive both ends.
  // `--loop 1..2` plays bars 1 and 2 (2 bars).
  let from: number
  let to: number
  const range = args.loop.match(/^(\d+)\.\.(\d+)$/)
  if (range) {
    const start = Number.parseInt(range[1]!, 10)
    const end = Number.parseInt(range[2]!, 10)
    if (end < start) {
      throw new Error(
        `--loop end (${end}) must be >= start (${start})`,
      )
    }
    from = start
    to = end
  } else {
    // Single-bar form: `--loop N` loops just measure N.
    const single = args.loop.match(/^(\d+)$/)
    if (!single) {
      throw new Error(
        `--loop must be a bar number or x..y range ` +
          `(e.g. --loop 3 for measure 3, or --loop 1..2 for ` +
          `bars 1 and 2). Got: "${args.loop}"`,
      )
    }
    const n = Number.parseInt(single[1]!, 10)
    from = n
    to = n
  }

  if (args.from !== undefined && args.from !== from) {
    throw new Error(
      `--loop start ${from} conflicts with --from ${args.from}`,
    )
  }
  if (args.to !== undefined && args.to !== to) {
    throw new Error(
      `--loop end bar ${to} conflicts with --to ${args.to}`,
    )
  }
  args.from = from
  args.to = to
}

async function runPlay(args: Args): Promise<void> {
  applyLoopFlag(args)
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

  // Resolve the effective hit list + bar map for the current
  // CLI flag combo (--from / --to / --part / --measure /
  // --humanize / --seed). Shared between internal-sync (which
  // schedules with setTimeout) and external-sync (which builds
  // a tick-indexed map). Returns hits with `beat` rebased so
  // the first played bar starts at beat 0.
  function buildSchedule(song: Song): {
    hits: Hit[]
    bars: BarInfo[]
    totalBeats: number
    fromBar: number
    toBar: number
    allBarCount: number
  } {
    const raw = expandSong(song)
    const humanizeConfig =
      args.humanize !== undefined
        ? HUMANIZE[args.humanize as HumanizePreset]
        : song.humanize
    const allHits = humanizeConfig
      ? humanize(raw, {
          ...humanizeConfig,
          seed: args.seed ?? humanizeConfig.seed,
        })
      : raw

    const allBars = expandArrangement(song)

    let fromBar = args.from ?? 1
    let toBar = args.to ?? allBars.length

    if (args.part) {
      const partBars = allBars.filter(b =>
        b.patternName.startsWith(`${args.part}-`),
      )
      if (partBars.length === 0) {
        const known = [
          ...new Set(
            allBars.map(b => b.patternName.replace(/-\d+$/, '')),
          ),
        ]
          .sort()
          .join(', ')
        throw new Error(
          `--part "${args.part}" not found in "${song.name}". ` +
            `Known parts: ${known}`,
        )
      }
      const measureWithinPart = args.measure ?? 1
      if (
        measureWithinPart < 1 ||
        measureWithinPart > partBars.length
      ) {
        throw new Error(
          `--measure ${measureWithinPart} out of range for part ` +
            `"${args.part}" (1..${partBars.length})`,
        )
      }
      fromBar = partBars[measureWithinPart - 1]!.totalBar
      if (args.to === undefined && args.measure === undefined) {
        toBar = partBars[partBars.length - 1]!.totalBar
      }
    }
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
    return {
      hits,
      bars,
      totalBeats: endBeat - startBeat,
      fromBar,
      toBar,
      allBarCount: allBars.length,
    }
  }

  function schedulePass(song: Song): Promise<void> {
    const built = buildSchedule(song)
    const { hits, bars, fromBar, toBar, allBarCount } = built

    const msPerBeat = 60_000 / song.bpm
    const lastBeat = Math.max(0, ...hits.map(h => h.beat))
    const totalMs = lastBeat * msPerBeat + 500

    logScheduleHeader(song, hits.length, fromBar, toBar, allBarCount, totalMs)

    for (const hit of hits) {
      // Humanization can produce slightly negative beats — clamp
      // to 0 so setTimeout doesn't get a negative delay.
      const delay = Math.max(0, hit.beat * msPerBeat)
      timers.push(setTimeout(() => patchedSendHit(hit), delay))
    }

    if (!args.silentBars) {
      scheduleBarLog(bars, msPerBeat, allBarCount)
    }

    return new Promise(done => {
      timers.push(setTimeout(() => done(), totalMs))
    })
  }

  function logScheduleHeader(
    song: Song,
    hitCount: number,
    fromBar: number,
    toBar: number,
    allBarCount: number,
    totalMs?: number,
  ): void {
    const tag = args.pattern
      ? `${song.name} [solo: ${args.pattern}]`
      : song.name
    const humanizeTag =
      args.humanize ?? (song.humanize ? 'song-default' : 'off')
    const rangeTag =
      fromBar === 1 && toBar === allBarCount
        ? `${allBarCount} bars`
        : `bars ${fromBar}-${toBar} of ${allBarCount}`
    const tail =
      totalMs !== undefined
        ? `, ${(totalMs / 1000).toFixed(1)}s `
        : ' '
    console.log(
      `[beat] playing "${tag}" @ ${song.bpm} BPM — ` +
        `${hitCount} hits, ${rangeTag}${tail}` +
        `[humanize: ${humanizeTag}]`,
    )
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

  if (args.sync === 'master') {
    await runMaster(song)
    stop()
    output.close()
    return
  }

  if (args.sync === 'link') {
    await runLink(song)
    stop()
    output.close()
    return
  }

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

  // -------------------------------------------------------------
  // Master mode: this script generates 24 PPQN MIDI clock and
  // start / stop / position pointers. Logic follows.
  // -------------------------------------------------------------
  //
  // Logic setup (one time):
  //   Settings → Synchronization → MIDI:
  //     - Sync Mode: External
  //     - "Listen to MIDI Input" → check the IAC port the script
  //       sends to (TS Drum Engine). Logic now follows our clock.
  //
  // Press <space> in this terminal to send `position 0` + `start`.
  // Both this script and Logic restart from bar 1 in lockstep.
  // Press <space> again to send `stop`. Ctrl-C exits.
  //
  // Editing the .beat file while playing: the schedule is rebuilt
  // between ticks without disturbing the clock, so Logic stays
  // locked. Tempo changes (editing `bpm` in the song) take effect
  // on the next tick — Logic adjusts because our tick spacing
  // changes.
  async function runMaster(initial: Song): Promise<void> {
    type TickMap = {
      hitsByTick: Map<number, Hit[]>
      barEdgesByTick: Map<number, BarInfo>
      lengthTicks: number
      bpm: number
      allBarCount: number
    }

    function build(song: Song): TickMap {
      const built = buildSchedule(song)
      const lengthTicks = Math.max(
        1,
        Math.round(built.totalBeats * PPQN),
      )

      const hitsByTick = new Map<number, Hit[]>()
      for (const hit of built.hits) {
        const t =
          ((Math.round(hit.beat * PPQN) % lengthTicks) + lengthTicks) %
          lengthTicks
        const bucket = hitsByTick.get(t) ?? []
        bucket.push(hit)
        hitsByTick.set(t, bucket)
      }

      const barEdgesByTick = new Map<number, BarInfo>()
      for (const bar of built.bars) {
        const t = Math.round(bar.startBeat * PPQN) % lengthTicks
        barEdgesByTick.set(t, bar)
      }

      logScheduleHeader(
        song,
        built.hits.length,
        built.fromBar,
        built.toBar,
        built.allBarCount,
      )
      return {
        hitsByTick,
        barEdgesByTick,
        lengthTicks,
        bpm: song.bpm,
        allBarCount: built.allBarCount,
      }
    }

    let map = build(initial)
    let tick = 0
    let lastSection = -1
    let playing = false
    let nextTimer: NodeJS.Timeout | null = null
    // Wall-clock anchor for drift-corrected scheduling. Each tick
    // is scheduled relative to startTime, not the previous tick,
    // so jitter doesn't accumulate.
    let startTime = 0

    function msPerTick(): number {
      return 60_000 / (map.bpm * PPQN)
    }

    function fireTick(): void {
      if (!playing) return

      // Send clock first so Logic's tick aligns with our hit fire.
      output.send('clock')

      if (dirty) {
        dirty = false
        try {
          const next = loadSongSync()
          map = build(next)
          // Don't reset `tick` — Logic is still counting; we just
          // changed the contents of the loop. lastSection reset
          // so the next bar log marks a section break.
          lastSection = -1
          console.log(`[beat] reloaded "${args.song}"`)
        } catch (err) {
          console.error('[beat] reload failed:', err)
        }
      }

      const local =
        ((tick % map.lengthTicks) + map.lengthTicks) % map.lengthTicks
      const hits = map.hitsByTick.get(local)
      if (hits) {
        for (const h of hits) patchedSendHit(h)
      }
      if (!args.silentBars) {
        const bar = map.barEdgesByTick.get(local)
        if (bar) {
          const sectionChanged = bar.sectionIndex !== lastSection
          lastSection = bar.sectionIndex
          const marker = sectionChanged ? '━' : '·'
          console.log(
            `  ${marker} bar ${String(bar.totalBar).padStart(3)}/` +
              `${map.allBarCount}  ${bar.patternName}` +
              (bar.barInSection > 1 ? ` (${bar.barInSection})` : ''),
          )
        }
      }

      tick++
      const target = startTime + tick * msPerTick()
      const delay = Math.max(0, target - performance.now())
      nextTimer = setTimeout(fireTick, delay)
    }

    function start(): void {
      if (playing) return
      // SPP=0 then start. Per MIDI spec, start arms the slave;
      // the first clock after start is downbeat. Logic locks on.
      output.send('position', { value: 0 })
      output.send('start')
      tick = 0
      lastSection = -1
      playing = true
      startTime = performance.now()
      console.log('[beat] ▶ start (bar 1)')
      fireTick()
    }

    function stopMaster(): void {
      if (!playing) return
      playing = false
      if (nextTimer) {
        clearTimeout(nextTimer)
        nextTimer = null
      }
      output.send('stop')
      stop()
      console.log('[beat] ■ stop')
    }

    function toggle(): void {
      if (playing) stopMaster()
      else start()
    }

    // Stdin: <space> toggles, ctrl-c exits cleanly.
    let cleanupStdin: (() => void) | null = null
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      const CTRL_C = String.fromCharCode(3)
      const onKey = (key: string): void => {
        if (key === ' ') toggle()
        else if (key === CTRL_C || key === 'q') {
          stopMaster()
          cleanupStdin?.()
          process.exit(0)
        }
      }
      process.stdin.on('data', onKey)
      cleanupStdin = () => {
        process.stdin.off('data', onKey)
        if (process.stdin.isTTY) process.stdin.setRawMode(false)
        process.stdin.pause()
      }
      console.log(
        '[beat] master mode — <space> = start/stop from bar 1, ctrl-c or q to quit',
      )
    } else {
      console.log('[beat] master mode (no TTY) — auto-starting')
    }

    // Auto-start once so Logic begins immediately. User can stop
    // and restart with space.
    start()

    await new Promise<void>(resolve => {
      process.on('SIGINT', () => {
        stopMaster()
        cleanupStdin?.()
        resolve()
      })
    })
  }

  // -------------------------------------------------------------
  // Link mode: Ableton Link peer. Logic Pro 11 dropped MIDI Clock
  // sync; Link is the modern replacement.
  // -------------------------------------------------------------
  //
  // Logic setup:
  //   File → Project Settings → Synchronization → General →
  //     Sync Mode: Ableton Link
  //   When Logic discovers another Link peer (this script), the
  //   transport bar shows "1 Link". Press play in either app or
  //   <space> in this terminal — both transports start in bar
  //   alignment.
  //
  // How alignment works:
  //   Link maintains a shared, monotonically-increasing beat
  //   counter across all peers + a quantum (bar length). When
  //   transport starts the script anchors its song origin to the
  //   next quantum boundary, so drums fire from beat 0 of the
  //   loop on a downbeat. As long as the song length is a whole
  //   multiple of the quantum, the loop re-aligns with Logic's
  //   bars on every wrap.
  //
  // Live editing:
  //   Save the .beat → tick map rebuilds on the next update. If
  //   the song's `bpm` changed, the new tempo is propagated to
  //   the Link session and Logic adjusts.
  async function runLink(initial: Song): Promise<void> {
    type BeatMap = {
      hits: { beat: number; hit: Hit }[]
      bars: BarInfo[]
      totalBeats: number
      bpm: number
      allBarCount: number
    }

    function build(song: Song): BeatMap {
      const built = buildSchedule(song)
      const sortedHits = [...built.hits]
        .sort((a, b) => a.beat - b.beat)
        .map(h => ({ beat: h.beat, hit: h }))
      logScheduleHeader(
        song,
        built.hits.length,
        built.fromBar,
        built.toBar,
        built.allBarCount,
      )
      return {
        hits: sortedHits,
        bars: built.bars,
        totalBeats: built.totalBeats,
        bpm: song.bpm,
        allBarCount: built.allBarCount,
      }
    }

    let map = build(initial)

    const link = new AbletonLink(map.bpm, args.quantum, true)
    link.enablePlayStateSync()

    // Origin: Link beat at the moment we (re)started. songBeat =
    // linkBeat - origin. null while transport is stopped.
    let origin: number | null = null
    let lastLocalBeat = -1
    let lastSection = -1
    let lastLoggedBarKey = ''

    function logBar(bar: BarInfo): void {
      if (args.silentBars) return
      // Throttle: each bar should print once per visit. Use a
      // composite key so a re-loop prints again.
      const key = `${bar.totalBar}`
      if (key === lastLoggedBarKey) return
      lastLoggedBarKey = key
      const sectionChanged = bar.sectionIndex !== lastSection
      lastSection = bar.sectionIndex
      const marker = sectionChanged ? '━' : '·'
      console.log(
        `  ${marker} bar ${String(bar.totalBar).padStart(3)}/` +
          `${map.allBarCount}  ${bar.patternName}` +
          (bar.barInSection > 1 ? ` (${bar.barInSection})` : ''),
      )
    }

    function fireRange(fromBeat: number, toBeat: number): void {
      // Half-open (fromBeat, toBeat]. fromBeat == -1 means "fire
      // anything from beat 0 up to and including toBeat".
      const lo = fromBeat
      const hi = toBeat
      for (const { beat, hit } of map.hits) {
        if (beat > lo && beat <= hi) {
          patchedSendHit(hit)
        }
      }
      // Bar logging — fire any bar whose startBeat falls in range.
      for (const bar of map.bars) {
        if (bar.startBeat > lo && bar.startBeat <= hi) {
          logBar(bar)
        }
      }
    }

    link.startUpdate(1, (beat, _phase, bpm, isPlaying) => {
      if (!isPlaying) {
        if (origin !== null) {
          stop()
          origin = null
          lastLocalBeat = -1
          lastSection = -1
          lastLoggedBarKey = ''
          console.log('[beat] ■ stop (link)')
        }
        return
      }

      if (dirty) {
        dirty = false
        try {
          const next = loadSongSync()
          map = build(next)
          if (map.bpm !== bpm) link.bpm = map.bpm
          lastSection = -1
          lastLoggedBarKey = ''
          console.log(`[beat] reloaded "${args.song}"`)
        } catch (err) {
          console.error('[beat] reload failed:', err)
        }
      }

      if (origin === null) {
        // Anchor at the current Link beat. Logic's Start/Stop
        // Sync starts transport IMMEDIATELY at the playhead
        // when it receives the play state — it does NOT wait
        // for the next quantum boundary. So we also start
        // immediately. Drums fire from beat 0 of the loop now.
        //
        // For drums + guitar to land on the same downbeat, the
        // user must position Logic's playhead at the cycle
        // region start (or wherever bar 1 of the song is)
        // before pressing space.
        //
        // offsetMs shifts origin earlier (positive) or later
        // (negative) to compensate for relative latency
        // between the IAC + SD3 chain and Logic's audio
        // engine. With origin shifted earlier, beat-0 hits
        // fire that many ms before the actual downbeat so the
        // audible drum aligns with Logic.
        const offsetBeats = (args.offsetMs / 1000) * (bpm / 60)
        origin = beat - offsetBeats
        lastLocalBeat = -1
        lastSection = -1
        lastLoggedBarKey = ''
        console.log(
          `[beat] ▶ play (link, origin = beat ${origin.toFixed(3)}, ` +
            `offset = ${args.offsetMs}ms)`,
        )
      }

      const songBeat = beat - origin
      if (songBeat < 0) return // before the anchored downbeat
      const loopBeats = map.totalBeats
      const localBeat =
        ((songBeat % loopBeats) + loopBeats) % loopBeats

      if (lastLocalBeat < 0) {
        // First firing window: (-eps, localBeat]
        fireRange(-Number.EPSILON, localBeat)
      } else if (localBeat >= lastLocalBeat) {
        fireRange(lastLocalBeat, localBeat)
      } else {
        // Wrapped around the loop.
        fireRange(lastLocalBeat, loopBeats)
        lastLoggedBarKey = ''
        fireRange(-Number.EPSILON, localBeat)
      }
      lastLocalBeat = localBeat
    })

    let cleanupStdin: (() => void) | null = null

    // Stop the Link session and tear down. `link.stop()` queues
    // a play-state-false message for peers, but the Link library
    // sends it asynchronously on its own thread — if we exit the
    // Node process immediately, Logic never sees the stop and
    // keeps playing. The 150ms pause is enough for the network
    // send + Logic's ack on loopback.
    function shutdown(): void {
      if (link.isPlaying) link.stop()
      stop()
      setTimeout(() => {
        link.stopUpdate()
        link.disable()
        cleanupStdin?.()
        process.exit(0)
      }, 150)
    }

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      const CTRL_C = String.fromCharCode(3)
      const onKey = (key: string): void => {
        if (key === ' ') {
          if (link.isPlaying) {
            link.stop()
          } else {
            origin = null
            link.play()
          }
        } else if (key === CTRL_C || key === 'q') {
          shutdown()
        }
      }
      process.stdin.on('data', onKey)
      cleanupStdin = () => {
        process.stdin.off('data', onKey)
        if (process.stdin.isTTY) process.stdin.setRawMode(false)
        process.stdin.pause()
      }
      console.log(
        '[beat] link mode — <space> = play/stop, ctrl-c or q to quit. ' +
          `quantum=${args.quantum} bpm=${map.bpm} offset=${args.offsetMs}ms`,
      )
    } else {
      console.log('[beat] link mode (no TTY) — auto-playing')
      link.play()
    }

    // Park forever. SIGINT routes through shutdown() so Logic
    // gets the stop message. shutdown() calls process.exit(),
    // so this promise never resolves naturally.
    await new Promise<void>(() => {
      process.on('SIGINT', () => shutdown())
    })
  }

  // Synchronous re-read used inside the tick callback. Avoids
  // awaiting an ESM dynamic import on the hot path. Only .beat
  // files are supported for hot reload — TS modules would need
  // a worker for sync compilation.
  function loadSongSync(): Song {
    if (!songPath.endsWith('.beat')) {
      throw new Error(
        'Hot-reload only supports .beat files. ' +
          `Got: ${songPath}`,
      )
    }
    const text = readFileSync(songPath, 'utf8')
    const result = parseTab(text)
    for (const e of result.errors) {
      console.warn(`[beat] tab ${e.severity}: ${e.message}`)
    }
    let s = result.song
    if (args.pattern) {
      const matched = s.patterns.find(p => p.name === args.pattern)
      if (!matched) {
        throw new Error(
          `--pattern "${args.pattern}" not found in "${s.name}"`,
        )
      }
      s = { ...s, arrangement: [{ pattern: args.pattern }] }
    }
    return s
  }
}
