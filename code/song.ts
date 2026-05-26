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
import { DEFAULT_BUS } from './route'
import type { HumanizeConfig } from './humanize'

export type Hit = {
  // Where in the pattern, in beats. Sub-beats fine: 0.5 = the
  // "and" of beat 1 (assuming 4/4).
  beat: number
  note: number
  velocity?: number   // 1-127, default 110
  durationMs?: number // default 120 — drums don't really care
  channel?: number    // default DRUM_CHANNEL (10 in human terms)
  // IAC port (bus) name fragment this hit routes to. Default:
  // DEFAULT_BUS (the lean single port). Set per-instrument for
  // the deep multi-family rig. See code/route.ts.
  port?: string
  // Set by the tab parser when this hit came from a dotted-below
  // glyph (e.g. `x̣`). Tells the post-parse re-timer to fold the
  // hit into a triplet group with its column neighbours. Stripped
  // before playback — only used internally by the parser.
  triplet?: boolean
  // Original slot position within the measure (0-indexed). Used
  // by the triplet re-timer; stripped before playback.
  slot?: number
  // Velocity-bucket bounds set when the hit's velocity came from
  // a digit (0-9) in a velocity row. Humanize clamps the velocity
  // jitter to this range so dynamics never cross a bucket.
  velocityMin?: number
  velocityMax?: number
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
  // Optional default IAC port for any hit that doesn't set one.
  port?: string
  patterns: Pattern[]
  // Order to play patterns in.
  arrangement: Section[]
  // Optional humanization applied to every hit at play time.
  // The CLI's --humanize flag overrides this. See code/humanize.
  humanize?: HumanizeConfig
}

// One problem found while expanding a song. Non-fatal (unknown
// pattern refs still throw); these are clamp/skip-worthy issues.
export type SongIssue = {
  message: string
  severity: 'error' | 'warning'
  pattern?: string
  beat?: number
}

// Validate a song without expanding it. Catches the common
// authoring mistakes: hits past the pattern length, out-of-range
// velocities/channels, unknown pattern references. Returns every
// issue (doesn't stop at the first) so authors fix them in one
// pass. `expandSong` runs this and throws only on unknown patterns.
export function validateSong(song: Song): SongIssue[] {
  const issues: SongIssue[] = []
  const names = new Set(song.patterns.map(p => p.name))

  for (const section of song.arrangement) {
    if (!names.has(section.pattern)) {
      issues.push({
        message: `arrangement references unknown pattern "${section.pattern}"`,
        severity: 'error',
        pattern: section.pattern,
      })
    }
  }

  for (const pattern of song.patterns) {
    if (pattern.beats <= 0) {
      issues.push({
        message: `pattern "${pattern.name}" has non-positive beats (${pattern.beats})`,
        severity: 'error',
        pattern: pattern.name,
      })
    }
    for (const hit of pattern.hits) {
      if (hit.beat < 0 || hit.beat >= pattern.beats) {
        issues.push({
          message: `hit at beat ${hit.beat} is outside pattern "${pattern.name}" length (0..${pattern.beats})`,
          severity: 'warning',
          pattern: pattern.name,
          beat: hit.beat,
        })
      }
      if (hit.note < 0 || hit.note > 127) {
        issues.push({
          message: `hit note ${hit.note} out of MIDI range (0-127) in "${pattern.name}"`,
          severity: 'error',
          pattern: pattern.name,
          beat: hit.beat,
        })
      }
      if (hit.velocity !== undefined && (hit.velocity < 1 || hit.velocity > 127)) {
        issues.push({
          message: `hit velocity ${hit.velocity} out of range (1-127) in "${pattern.name}"`,
          severity: 'warning',
          pattern: pattern.name,
          beat: hit.beat,
        })
      }
      if (hit.channel !== undefined && (hit.channel < 0 || hit.channel > 15)) {
        issues.push({
          message: `hit channel ${hit.channel} out of range (0-15) in "${pattern.name}"`,
          severity: 'error',
          pattern: pattern.name,
          beat: hit.beat,
        })
      }
    }
  }
  return issues
}

// Helper: resolve `arrangement` into a flat hit list with
// absolute beat positions. The player calls this once per song.
// Stamps the resolved channel + port onto every hit so downstream
// (humanize, routing) never has to re-derive them.
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
          port: hit.port ?? song.port ?? DEFAULT_BUS,
        })
      }
      cursor += pattern.beats
    }
  }
  return out
}
