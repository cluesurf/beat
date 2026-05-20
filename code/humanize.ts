// Humanize a Hit[] — apply controlled timing + velocity jitter
// so the playback sounds like a person, not a clock.
//
// Real drummers don't play to grid. Snare backbeats land 5-15ms
// behind the click. Hi-hat hands wander on velocity. Each kick
// is a few ticks tighter than the last. Apply the same kind of
// noise here and the MIDI output stops sounding robotic.
//
// Usage:
//
//   import { humanize, HUMANIZE } from '@/code/humanize'
//   const human = humanize(hits, HUMANIZE.subtle)
//
// Or via the CLI:
//
//   pnpm play kitchen-sink --humanize subtle
//   pnpm play kitchen-sink --humanize loose --seed 42

import type { Hit } from './song'

// ---------------------------------------------------------------
// Config
// ---------------------------------------------------------------

export type HumanizeConfig = {
  // Timing jitter spread, in BEATS. e.g., 0.02 = ±0.02 of a
  // beat ≈ 15ms at BPM 80. Random uniform within ±spread.
  timing?: number

  // Velocity jitter spread in MIDI units (1-127). e.g., 8 means
  // each velocity gets a random ±8 added. Result is clamped.
  velocity?: number

  // Timing bias: -1 = always behind, +1 = always ahead, 0 =
  // symmetric. Real drummers usually drag (~-0.2). Affects
  // every hit in addition to the random jitter.
  timingBias?: number

  // Per-note overrides. Use to keep the kick steady while
  // letting the hi-hat breathe:
  //   byNote: { [NOTE.kick]: { timing: 0.005 }, [NOTE.closedHat]: { timing: 0.04 } }
  byNote?: Record<number, NoteHumanize>

  // Optional seed for reproducible humanization. Omit and each
  // run picks a fresh seed.
  seed?: number
}

export type NoteHumanize = Pick<HumanizeConfig, 'timing' | 'velocity' | 'timingBias'>

// ---------------------------------------------------------------
// Presets
// ---------------------------------------------------------------
//
// Names match the CLI's --humanize flag values. `off` is a
// no-op; the rest get progressively looser.

export const HUMANIZE: Record<string, HumanizeConfig> = {
  off: {},

  // Studio-tight session player. Nearly grid, just enough wiggle
  // to take the click off the surface.
  tight: { timing: 0.005, velocity: 3 },

  // Solid pro player. The default for most things — hits sit
  // in the pocket but feel alive.
  subtle: { timing: 0.015, velocity: 6, timingBias: -0.1 },

  // Behind-the-beat groove player. Wider velocity swings,
  // noticeable drag.
  loose: { timing: 0.03, velocity: 12, timingBias: -0.2 },

  // Garage-band drummer. Don't quantize anything ever.
  sloppy: { timing: 0.06, velocity: 20, timingBias: -0.15 },
} as const

export type HumanizePreset = keyof typeof HUMANIZE

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------

export function humanize(hits: Hit[], config: HumanizeConfig): Hit[] {
  if (isNoOp(config)) return hits

  const seed = config.seed ?? randomSeed()
  const rng = makeRng(seed)

  return hits.map(hit => {
    const perNote = config.byNote?.[hit.note] ?? {}
    const timingSpread = perNote.timing ?? config.timing ?? 0
    const velocitySpread = perNote.velocity ?? config.velocity ?? 0
    const timingBias = perNote.timingBias ?? config.timingBias ?? 0

    let beat = hit.beat
    if (timingSpread > 0 || timingBias !== 0) {
      if (hit.beat === 0) {
        // Beat 0 is the loop's downbeat. Any negative shift drops
        // the hit before the playback's firing window and it
        // silently disappears. Force positive-only jitter and
        // discard negative bias so beat 0 always plays.
        const jitter = rng() * timingSpread
        const biasShift = Math.max(0, timingBias) * timingSpread
        beat = hit.beat + jitter + biasShift
      } else {
        // Random jitter ∈ [-spread, +spread], shifted by bias.
        const jitter = (rng() * 2 - 1) * timingSpread
        const biasShift = timingBias * timingSpread
        beat = Math.max(0, hit.beat + jitter + biasShift)
      }
    }

    let velocity = hit.velocity ?? 100
    if (velocitySpread > 0) {
      const delta = Math.round((rng() * 2 - 1) * velocitySpread)
      // If the parser set a bucket range (digit in a velocity
      // row), clamp jitter inside it so the hit's dynamic stays
      // in the bucket the user wrote.
      const lo = hit.velocityMin ?? 1
      const hi = hit.velocityMax ?? 127
      velocity = clamp(velocity + delta, lo, hi)
    }

    return { ...hit, beat, velocity }
  })
}

// ---------------------------------------------------------------
// Internals
// ---------------------------------------------------------------

function isNoOp(config: HumanizeConfig): boolean {
  if (!config.timing && !config.velocity && !config.timingBias) {
    return !config.byNote || Object.keys(config.byNote).length === 0
  }
  return false
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0
}

// Mulberry32 — tiny seeded PRNG. Returns a function that yields
// uniformly-distributed floats in [0, 1). Same seed = same
// sequence, so humanization is reproducible.
function makeRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
