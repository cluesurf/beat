// Kitchen-sink reference song. Every pattern demonstrates one
// concept — a subdivision, a polyrhythm, a dynamics shape, an
// articulation. Play the whole thing to audition your kit, or
// solo a single concept:
//
//   pnpm play kitchen-sink                          # all of it
//   pnpm play kitchen-sink --pattern eighths        # just 8ths
//   pnpm play kitchen-sink --pattern poly-3-over-4  # just 3:4
//
// Subdivisions covered (every "X-over-quarter" counted in beats):
//
//   quarter notes        spacing 1
//   8th notes            spacing 0.5         (2 per quarter)
//   16th notes           spacing 0.25        (4 per quarter)
//   32nd notes           spacing 0.125       (8 per quarter)
//   8th triplets         spacing 1/3         (3 per quarter)
//   16th triplets        spacing 1/6         (6 per quarter)
//   32nd triplets        spacing 1/12        (12 per quarter)
//   quarter triplets     spacing 2/3         (3 per half note)
//
// Then: polyrhythms (3:4, 5:4, 7:8), swing 8ths, flam, drag,
// buzz roll, crescendo, decrescendo, accents, ghost notes,
// linear vs layered, tom melodies, rim variants, cymbal choke.

import type { Hit, Pattern, Song } from '@/code/song'
import { NOTE } from '@/code/note'

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
//
// Patterns are just arrays of {beat, note, velocity}. These
// helpers cut the boilerplate for evenly-spaced runs and
// dynamics ramps. They return Hit[]; combine with `...spread`
// inside a pattern's `hits` list.

function evenly(opts: {
  start: number
  count: number
  spacing: number
  note: number
  velocity?: number
}): Hit[] {
  return Array.from({ length: opts.count }, (_, i) => ({
    beat: opts.start + i * opts.spacing,
    note: opts.note,
    velocity: opts.velocity ?? 95,
  }))
}

function ramp(opts: {
  start: number
  count: number
  spacing: number
  note: number
  fromVelocity: number
  toVelocity: number
}): Hit[] {
  const { count, fromVelocity, toVelocity } = opts
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 1 : i / (count - 1)
    const velocity = Math.round(
      fromVelocity + (toVelocity - fromVelocity) * t,
    )
    return {
      beat: opts.start + i * opts.spacing,
      note: opts.note,
      velocity,
    }
  })
}

// ---------------------------------------------------------------
// Patterns — pure subdivisions
// ---------------------------------------------------------------

const quarters: Pattern = {
  name: 'quarters',
  beats: 4,
  hits: evenly({
    start: 0,
    count: 4,
    spacing: 1,
    note: NOTE.kick,
    velocity: 110,
  }),
}

const eighths: Pattern = {
  name: 'eighths',
  beats: 4,
  hits: Array.from({ length: 8 }, (_, i) => ({
    beat: i * 0.5,
    note: i % 2 === 0 ? NOTE.kick : NOTE.snare,
    velocity: 105,
  })),
}

const sixteenths: Pattern = {
  name: 'sixteenths',
  beats: 4,
  hits: [
    ...evenly({
      start: 0,
      count: 16,
      spacing: 0.25,
      note: NOTE.closedHat,
      velocity: 80,
    }),
    { beat: 0, note: NOTE.kick, velocity: 115 },
    { beat: 1, note: NOTE.snare, velocity: 115 },
    { beat: 2, note: NOTE.kick, velocity: 115 },
    { beat: 3, note: NOTE.snare, velocity: 115 },
  ],
}

const thirtySeconds: Pattern = {
  name: 'thirty-seconds',
  beats: 4,
  hits: [
    ...evenly({
      start: 0,
      count: 32,
      spacing: 0.125,
      note: NOTE.closedHat,
      velocity: 70,
    }),
    { beat: 0, note: NOTE.kick, velocity: 115 },
    { beat: 2, note: NOTE.snare, velocity: 115 },
  ],
}

// ---------------------------------------------------------------
// Patterns — triplets
// ---------------------------------------------------------------

const eighthTriplets: Pattern = {
  name: 'eighth-triplets',
  beats: 4,
  hits: [
    ...evenly({
      start: 0,
      count: 12,
      spacing: 1 / 3,
      note: NOTE.closedHat,
      velocity: 85,
    }),
    { beat: 0, note: NOTE.kick, velocity: 115 },
    { beat: 1, note: NOTE.snare, velocity: 115 },
    { beat: 2, note: NOTE.kick, velocity: 115 },
    { beat: 3, note: NOTE.snare, velocity: 115 },
  ],
}

const sixteenthTriplets: Pattern = {
  name: 'sixteenth-triplets',
  beats: 4,
  hits: [
    ...evenly({
      start: 0,
      count: 24,
      spacing: 1 / 6,
      note: NOTE.closedHat,
      velocity: 75,
    }),
    { beat: 0, note: NOTE.kick, velocity: 115 },
    { beat: 2, note: NOTE.snare, velocity: 115 },
  ],
}

const thirtySecondTriplets: Pattern = {
  name: 'thirty-second-triplets',
  beats: 4,
  hits: [
    ...evenly({
      start: 0,
      count: 48,
      spacing: 1 / 12,
      note: NOTE.closedHat,
      velocity: 65,
    }),
    { beat: 0, note: NOTE.kick, velocity: 120 },
  ],
}

const quarterTriplets: Pattern = {
  name: 'quarter-triplets',
  beats: 4,
  // Two cycles of "3 in the space of 2 quarters". Spacing 2/3.
  hits: [
    ...evenly({
      start: 0,
      count: 3,
      spacing: 2 / 3,
      note: NOTE.tomLow,
      velocity: 110,
    }),
    ...evenly({
      start: 2,
      count: 3,
      spacing: 2 / 3,
      note: NOTE.floorTom,
      velocity: 110,
    }),
    { beat: 0, note: NOTE.kick, velocity: 115 },
    { beat: 2, note: NOTE.kick, velocity: 115 },
  ],
}

// ---------------------------------------------------------------
// Patterns — polyrhythms
// ---------------------------------------------------------------

const poly3Over4: Pattern = {
  name: 'poly-3-over-4',
  beats: 4,
  // Kick on every quarter (4). Snare three evenly-spaced over the
  // same 4 beats (spacing 4/3). The two voices "lock back up" at
  // the bar.
  hits: [
    ...evenly({
      start: 0,
      count: 4,
      spacing: 1,
      note: NOTE.kick,
      velocity: 110,
    }),
    ...evenly({
      start: 0,
      count: 3,
      spacing: 4 / 3,
      note: NOTE.tomMid,
      velocity: 110,
    }),
  ],
}

const poly5Over4: Pattern = {
  name: 'poly-5-over-4',
  beats: 4,
  hits: [
    ...evenly({
      start: 0,
      count: 4,
      spacing: 1,
      note: NOTE.kick,
      velocity: 110,
    }),
    ...evenly({
      start: 0,
      count: 5,
      spacing: 4 / 5,
      note: NOTE.rideTip,
      velocity: 100,
    }),
  ],
}

const poly7Over8: Pattern = {
  name: 'poly-7-over-8',
  beats: 4,
  // 8 8th notes on closedHat. 7 evenly-spaced hits across the
  // same span on tomMid (spacing 4/7).
  hits: [
    ...evenly({
      start: 0,
      count: 8,
      spacing: 0.5,
      note: NOTE.closedHat,
      velocity: 80,
    }),
    ...evenly({
      start: 0,
      count: 7,
      spacing: 4 / 7,
      note: NOTE.tomMid,
      velocity: 105,
    }),
  ],
}

// ---------------------------------------------------------------
// Patterns — feel
// ---------------------------------------------------------------

const swingEighths: Pattern = {
  name: 'swing-eighths',
  beats: 4,
  // Shuffle ratio 2:1 — the off-beat 8th lands at 2/3 through
  // each quarter instead of 1/2. Classic jazz swing.
  hits: [
    ...[0, 1, 2, 3].flatMap(b => [
      { beat: b, note: NOTE.rideTip, velocity: 100 },
      { beat: b + 2 / 3, note: NOTE.rideTip, velocity: 80 },
    ]),
    { beat: 0, note: NOTE.kick, velocity: 110 },
    { beat: 1, note: NOTE.snare, velocity: 110 },
    { beat: 2, note: NOTE.kick, velocity: 110 },
    { beat: 3, note: NOTE.snare, velocity: 110 },
  ],
}

const flam: Pattern = {
  name: 'flam',
  beats: 4,
  // A grace note ~30ms before each main hit (flam). At BPM 80
  // that's roughly 0.04 of a beat.
  hits: [0, 1, 2, 3].flatMap(b => [
    { beat: b - 0.04, note: NOTE.snare, velocity: 50 },
    { beat: b, note: NOTE.snare, velocity: 115 },
  ]),
}

const drag: Pattern = {
  name: 'drag',
  beats: 4,
  // Two grace notes + main hit. 30ms and 60ms before.
  hits: [0, 1, 2, 3].flatMap(b => [
    { beat: b - 0.08, note: NOTE.snare, velocity: 40 },
    { beat: b - 0.04, note: NOTE.snare, velocity: 50 },
    { beat: b, note: NOTE.snare, velocity: 115 },
  ]),
}

const buzzRoll: Pattern = {
  name: 'buzz-roll',
  beats: 4,
  // 32 soft snare hits across 4 beats — the closest MIDI gets
  // to a buzz roll without the snareRoll articulation.
  hits: evenly({
    start: 0,
    count: 32,
    spacing: 0.125,
    note: NOTE.snare,
    velocity: 50,
  }),
}

const crescendoRoll: Pattern = {
  name: 'crescendo-roll',
  beats: 4,
  hits: ramp({
    start: 0,
    count: 32,
    spacing: 0.125,
    note: NOTE.snare,
    fromVelocity: 30,
    toVelocity: 127,
  }),
}

const decrescendoRoll: Pattern = {
  name: 'decrescendo-roll',
  beats: 4,
  hits: ramp({
    start: 0,
    count: 32,
    spacing: 0.125,
    note: NOTE.snare,
    fromVelocity: 127,
    toVelocity: 30,
  }),
}

const accentPattern: Pattern = {
  name: 'accent-pattern',
  beats: 4,
  // 16 16th-note hi-hats. Strong accents on every quarter,
  // soft elsewhere.
  hits: Array.from({ length: 16 }, (_, i) => ({
    beat: i * 0.25,
    note: NOTE.closedHat,
    velocity: i % 4 === 0 ? 115 : 60,
  })),
}

const ghostPattern: Pattern = {
  name: 'ghost-pattern',
  beats: 4,
  hits: [
    // backbeat
    { beat: 0, note: NOTE.kick, velocity: 115 },
    { beat: 1, note: NOTE.snare, velocity: 120 },
    { beat: 2, note: NOTE.kick, velocity: 115 },
    { beat: 3, note: NOTE.snare, velocity: 120 },
    // ghosts on the ands and the e/a
    { beat: 0.5, note: NOTE.snare, velocity: 25 },
    { beat: 0.75, note: NOTE.snare, velocity: 25 },
    { beat: 1.5, note: NOTE.snare, velocity: 25 },
    { beat: 2.5, note: NOTE.snare, velocity: 25 },
    { beat: 2.75, note: NOTE.snare, velocity: 25 },
    { beat: 3.5, note: NOTE.snare, velocity: 25 },
    // hi-hat 8ths over the top
    ...evenly({
      start: 0,
      count: 8,
      spacing: 0.5,
      note: NOTE.closedHat,
      velocity: 70,
    }),
  ],
}

// ---------------------------------------------------------------
// Patterns — sequencing
// ---------------------------------------------------------------

const linearFill: Pattern = {
  name: 'linear-fill',
  beats: 4,
  // No two voices ever sound at the same beat. Each 16th is one
  // distinct drum: a "linear" Carey-style fill.
  hits: [
    { beat: 0.0, note: NOTE.kick, velocity: 115 },
    { beat: 0.25, note: NOTE.snare, velocity: 110 },
    { beat: 0.5, note: NOTE.tomHigh, velocity: 105 },
    { beat: 0.75, note: NOTE.tomMid, velocity: 105 },
    { beat: 1.0, note: NOTE.tomLow, velocity: 105 },
    { beat: 1.25, note: NOTE.floorTom, velocity: 110 },
    { beat: 1.5, note: NOTE.floorTomLow, velocity: 110 },
    { beat: 1.75, note: NOTE.kick, velocity: 115 },
    { beat: 2.0, note: NOTE.snare, velocity: 110 },
    { beat: 2.25, note: NOTE.snareRim, velocity: 100 },
    { beat: 2.5, note: NOTE.tomHigh, velocity: 105 },
    { beat: 2.75, note: NOTE.tomMid, velocity: 105 },
    { beat: 3.0, note: NOTE.tomLow, velocity: 105 },
    { beat: 3.25, note: NOTE.floorTom, velocity: 110 },
    { beat: 3.5, note: NOTE.floorTomLow, velocity: 110 },
    { beat: 3.75, note: NOTE.kick, velocity: 120 },
  ],
}

const layeredHit: Pattern = {
  name: 'layered-hit',
  beats: 4,
  // Every voice on beat 1, silence elsewhere. Lets you hear how
  // the kit stacks when many drums fire on the same instant.
  hits: [
    { beat: 0, note: NOTE.kick, velocity: 125 },
    { beat: 0, note: NOTE.snare, velocity: 120 },
    { beat: 0, note: NOTE.tomHigh, velocity: 115 },
    { beat: 0, note: NOTE.tomMid, velocity: 115 },
    { beat: 0, note: NOTE.tomLow, velocity: 115 },
    { beat: 0, note: NOTE.floorTom, velocity: 115 },
    { beat: 0, note: NOTE.floorTomLow, velocity: 115 },
    { beat: 0, note: NOTE.crashLeft, velocity: 120 },
    { beat: 0, note: NOTE.crashRight, velocity: 120 },
    { beat: 0, note: NOTE.china, velocity: 110 },
    { beat: 0, note: NOTE.rideBell, velocity: 110 },
  ],
}

const tomDescend: Pattern = {
  name: 'tom-descend',
  beats: 4,
  // High → low tom melody as 16th notes.
  hits: [
    { beat: 0.0, note: NOTE.tomHigh, velocity: 110 },
    { beat: 0.25, note: NOTE.tomMid, velocity: 110 },
    { beat: 0.5, note: NOTE.tomLow, velocity: 110 },
    { beat: 0.75, note: NOTE.floorTom, velocity: 110 },
    { beat: 1.0, note: NOTE.floorTomLow, velocity: 110 },
    { beat: 1.5, note: NOTE.tomHigh, velocity: 110 },
    { beat: 1.75, note: NOTE.tomMid, velocity: 110 },
    { beat: 2.0, note: NOTE.tomLow, velocity: 110 },
    { beat: 2.25, note: NOTE.floorTom, velocity: 110 },
    { beat: 2.5, note: NOTE.floorTomLow, velocity: 110 },
    { beat: 3.0, note: NOTE.kick, velocity: 120 },
    { beat: 3, note: NOTE.crashLeft, velocity: 115 },
  ],
}

const tomAscend: Pattern = {
  name: 'tom-ascend',
  beats: 4,
  hits: [
    { beat: 0.0, note: NOTE.floorTomLow, velocity: 110 },
    { beat: 0.25, note: NOTE.floorTom, velocity: 110 },
    { beat: 0.5, note: NOTE.tomLow, velocity: 110 },
    { beat: 0.75, note: NOTE.tomMid, velocity: 110 },
    { beat: 1.0, note: NOTE.tomHigh, velocity: 110 },
    { beat: 1.5, note: NOTE.floorTomLow, velocity: 110 },
    { beat: 1.75, note: NOTE.floorTom, velocity: 110 },
    { beat: 2.0, note: NOTE.tomLow, velocity: 110 },
    { beat: 2.25, note: NOTE.tomMid, velocity: 110 },
    { beat: 2.5, note: NOTE.tomHigh, velocity: 110 },
    { beat: 3.0, note: NOTE.kick, velocity: 120 },
    { beat: 3, note: NOTE.crashRight, velocity: 115 },
  ],
}

const rimMix: Pattern = {
  name: 'rim-mix',
  beats: 4,
  // Cycle the four snare articulations: main, rim shot, rim
  // only, sidestick. Same beat positions as a simple backbeat
  // so you can hear the timbre swap.
  hits: [
    { beat: 0, note: NOTE.snare, velocity: 115 },
    { beat: 1, note: NOTE.snareRim, velocity: 115 },
    { beat: 2, note: NOTE.snareRimOnly, velocity: 110 },
    { beat: 3, note: NOTE.snareSidestick, velocity: 110 },
    ...evenly({
      start: 0,
      count: 8,
      spacing: 0.5,
      note: NOTE.closedHat,
      velocity: 75,
    }),
  ],
}

const crashChoke: Pattern = {
  name: 'crash-choke',
  beats: 4,
  // Hit a crash, then choke it ~half a beat later (velocity 1
  // = choke in SD3 default). Repeat with the right crash and
  // china so you can hear each cymbal cut off.
  hits: [
    { beat: 0, note: NOTE.kick, velocity: 120 },
    { beat: 0, note: NOTE.crashLeft, velocity: 120 },
    { beat: 0.5, note: NOTE.crashLeft, velocity: 1 },
    { beat: 1, note: NOTE.kick, velocity: 120 },
    { beat: 1, note: NOTE.crashRight, velocity: 120 },
    { beat: 1.5, note: NOTE.crashRight, velocity: 1 },
    { beat: 2, note: NOTE.kick, velocity: 120 },
    { beat: 2, note: NOTE.china, velocity: 115 },
    { beat: 2.5, note: NOTE.china, velocity: 1 },
    { beat: 3, note: NOTE.kick, velocity: 120 },
    { beat: 3, note: NOTE.splash, velocity: 110 },
    { beat: 3.5, note: NOTE.splash, velocity: 1 },
  ],
}

// ---------------------------------------------------------------
// The song
// ---------------------------------------------------------------

const song: Song = {
  name: 'Kitchen Sink',
  bpm: 80,
  patterns: [
    quarters,
    eighths,
    sixteenths,
    thirtySeconds,
    eighthTriplets,
    sixteenthTriplets,
    thirtySecondTriplets,
    quarterTriplets,
    poly3Over4,
    poly5Over4,
    poly7Over8,
    swingEighths,
    flam,
    drag,
    buzzRoll,
    crescendoRoll,
    decrescendoRoll,
    accentPattern,
    ghostPattern,
    linearFill,
    layeredHit,
    tomDescend,
    tomAscend,
    rimMix,
    crashChoke,
  ],
  arrangement: [
    { pattern: 'quarters' },
    { pattern: 'eighths' },
    { pattern: 'sixteenths' },
    { pattern: 'thirty-seconds' },
    { pattern: 'eighth-triplets' },
    { pattern: 'sixteenth-triplets' },
    { pattern: 'thirty-second-triplets' },
    { pattern: 'quarter-triplets' },
    { pattern: 'poly-3-over-4' },
    { pattern: 'poly-5-over-4' },
    { pattern: 'poly-7-over-8' },
    { pattern: 'swing-eighths' },
    { pattern: 'flam' },
    { pattern: 'drag' },
    { pattern: 'buzz-roll' },
    { pattern: 'crescendo-roll' },
    { pattern: 'decrescendo-roll' },
    { pattern: 'accent-pattern' },
    { pattern: 'ghost-pattern' },
    { pattern: 'linear-fill' },
    { pattern: 'layered-hit' },
    { pattern: 'tom-descend' },
    { pattern: 'tom-ascend' },
    { pattern: 'rim-mix' },
    { pattern: 'crash-choke' },
  ],
}

export default song
