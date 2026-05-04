// Programmatic `play()` — same scheduling logic as the `beat`
// CLI but invokable from library users:
//
//   import { parse, play } from '@cluesurf/beat'
//   const { song } = parse(readFileSync('foo.beat', 'utf8'))
//   await play(song)                    // play once
//   await play(song, { loop: true })    // forever; resolves on stop()

import easymidi from 'easymidi'

import { expandSong, type Hit, type Song } from './song'
import { humanize, HUMANIZE, type HumanizePreset } from './humanize'
import type { HumanizeConfig } from './humanize'
import { openDrumOutput } from './output'
import { sendHit } from './hit'
import { DRUM_CHANNEL } from './note'

export type PlayOptions = {
  // Loop forever until stop() is called. Default: false (one pass).
  loop?: boolean
  // Apply humanization. Either a preset name or an inline config.
  // If omitted, the song's own `humanize` field is used.
  humanize?: HumanizePreset | HumanizeConfig
  // Reproducible humanize seed.
  seed?: number
  // Called once per loop iteration after that pass finishes.
  onLoopComplete?: (iteration: number) => void
}

export type PlayHandle = {
  // Promise that resolves when playback finishes (or stop() is called).
  promise: Promise<void>
  // Cancel pending hits, send all-notes-off, close the MIDI port.
  stop: () => void
}

export function play(song: Song, opts: PlayOptions = {}): PlayHandle {
  const output = openDrumOutput()
  let timers: NodeJS.Timeout[] = []
  const sounding = new Set<number>()
  let stopped = false

  function patchedSendHit(hit: Hit): void {
    sounding.add(hit.note)
    sendHit(output, hit)
    setTimeout(() => sounding.delete(hit.note), (hit.durationMs ?? 120) + 50)
  }

  function stop(): void {
    if (stopped) return
    stopped = true
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
    output.close()
  }

  function schedulePass(): Promise<void> {
    const raw = expandSong(song)
    const humanizeConfig = resolveHumanize(opts.humanize, song.humanize)
    const hits = humanizeConfig
      ? humanize(raw, { ...humanizeConfig, seed: opts.seed ?? humanizeConfig.seed })
      : raw

    const msPerBeat = 60_000 / song.bpm
    const lastBeat = Math.max(0, ...hits.map(h => h.beat))
    const totalMs = lastBeat * msPerBeat + 500

    for (const hit of hits) {
      const delay = Math.max(0, hit.beat * msPerBeat)
      timers.push(setTimeout(() => patchedSendHit(hit), delay))
    }

    return new Promise(done => {
      timers.push(setTimeout(() => done(), totalMs))
    })
  }

  const promise = (async (): Promise<void> => {
    let iteration = 0
    while (!stopped) {
      await schedulePass()
      iteration++
      opts.onLoopComplete?.(iteration)
      if (!opts.loop) break
    }
    stop()
  })()

  return { promise, stop }
}

function resolveHumanize(
  arg: PlayOptions['humanize'],
  songDefault: HumanizeConfig | undefined,
): HumanizeConfig | undefined {
  if (arg === undefined) return songDefault
  if (typeof arg === 'string') return HUMANIZE[arg]
  return arg
}
