// Song format. Every song under `beat/base/song/<name>/index.ts`
// exports a default Song that this module knows how to play.
//
// Design principles:
//
// - A Song is just data. No side effects on import. The player
//   (code/play.ts) consumes it and emits MIDI.
//
// - Time is in BEATS, not milliseconds. `bpm` translates to
//   wall-clock at play time. Lets you change tempo without
//   rewriting patterns.
//
// - Patterns are reusable. Songs reference patterns by name in
//   the `arrangement` so a verse pattern can repeat 8 times
//   without duplicating hits.
//
// - Layers are opt-in per pattern (or per hit). One snare hit
//   can fan out to multiple notes/channels — the Tool / Danny
//   Carey trick — without the pattern data getting noisy.

import { DRUM_CHANNEL } from './note'
import type { HumanizeConfig } from './humanize'

export type Hit = {
  // Where in the pattern, in beats. Sub-beats fine: 0.5 = the
  // "and" of beat 1 (assuming 4/4).
  beat: number
  note: number
  velocity?: number   // 1-127, default 110
  durationMs?: number // default 120 — drums don't really care
  channel?: number    // default DRUM_CHANNEL (10 in human terms)
}

export type Pattern = {
  name: string
  // Loop length in beats. A 4/4 one-bar pattern is 4 beats.
  // Patterns shorter or longer than the bar are fine — the
  // arrangement composes them.
  beats: number
  hits: Hit[]
}

export type Section = {
  // Reference to a Pattern.name. Allows reuse across the song.
  pattern: string
  // How many times to repeat. 1 = play once.
  repeat?: number
}

export type Song = {
  name: string
  bpm: number
  // Optional default channel for any hit that doesn't set one.
  channel?: number
  patterns: Pattern[]
  // Order to play patterns in.
  arrangement: Section[]
  // Optional humanization applied to every hit at play time.
  // The CLI's --humanize flag overrides this. See code/humanize.
  humanize?: HumanizeConfig
}

// Helper: resolve `arrangement` into a flat hit list with
// absolute beat positions. The player calls this once per song.
export function expandSong(song: Song): Hit[] {
  const byName = new Map(song.patterns.map(p => [p.name, p]))
  const out: Hit[] = []
  let cursor = 0

  for (const section of song.arrangement) {
    const pattern = byName.get(section.pattern)
    if (!pattern) {
      throw new Error(
        `Song "${song.name}" arrangement references unknown pattern "${section.pattern}".`,
      )
    }
    const repeat = section.repeat ?? 1
    for (let i = 0; i < repeat; i++) {
      for (const hit of pattern.hits) {
        out.push({
          ...hit,
          beat: hit.beat + cursor,
          channel: hit.channel ?? song.channel ?? DRUM_CHANNEL,
        })
      }
      cursor += pattern.beats
    }
  }
  return out
}
