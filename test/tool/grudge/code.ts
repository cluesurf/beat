// Tool — "The Grudge" intro (16 bars). DSL form: imperative
// TypeScript, no tab parser. The same song lives in `text.ts`
// (ASCII tab) and `data.ts` (JSON-ish).
//
//   - Time signature: 5/8 (5 eighth notes per bar = 2.5 quarter beats)
//   - Tempo: ♩ = 98
//
// Position math: 10 16th-note positions per 5/8 bar at 0.25-beat
// spacing — position p ↦ beat p × 0.25.

import type { Hit, Pattern, Song } from '@/code/song'
import { NOTE } from '@/code/note'

const BEATS_PER_BAR = 2.5

// Voices that repeat identically every bar.
const KICK_BEATS = [0, 0.75, 1.25, 2.0]
const FLOOR_BEATS = [0, 0.75] // large floor tom
const FOOT_BEATS = [1.25, 2.0] // small floor tom (accented)

// Six unique rack-tom shapes used across the 16 bars.
const TOM_SHAPES: number[][] = [
  [0.25, 0.5, 1.75, 2.25], // A: bar 1
  [0.25, 0.5, 1.0, 1.5, 1.75, 2.25], // B: bar 2
  [0.5, 1.5, 1.75], // C: bar 3
  [0.25, 0.5, 1.5, 1.75, 2.25], // D: bars 4, 5, 9-15 (the main shape)
  [0.25, 0.5, 1.5, 1.75], // E: bars 6, 8, 16
  [0.5, 1.5, 1.75, 2.25], // F: bar 7
]

// Map each of the 16 bars to a TOM_SHAPES index.
const BAR_TO_SHAPE = [
  0,
  1,
  2,
  3,
  3, // bars  1-5  (A B C D D)
  4,
  5,
  4, // bars  6-8  (E F E)
  3,
  3,
  3,
  3,
  3,
  3,
  3, // bars  9-15 (D × 7)
  4, // bar  16    (E)
]

function buildBar(shapeIdx: number): Hit[] {
  const hits: Hit[] = []
  for (const b of KICK_BEATS) {
    hits.push({ beat: b, note: NOTE.kick, velocity: 95 })
  }
  for (const b of FLOOR_BEATS) {
    hits.push({ beat: b, note: NOTE.floorTomLow, velocity: 95 })
  }
  for (const b of FOOT_BEATS) {
    hits.push({ beat: b, note: NOTE.floorTom, velocity: 118 })
  }
  for (const b of TOM_SHAPES[shapeIdx]) {
    hits.push({ beat: b, note: NOTE.tomMid, velocity: 95 })
  }
  return hits.sort((a, b) => a.beat - b.beat)
}

const patterns: Pattern[] = BAR_TO_SHAPE.map((shape, i) => ({
  name: `bar-${String(i + 1).padStart(2, '0')}`,
  beats: BEATS_PER_BAR,
  hits: buildBar(shape),
}))

const song: Song = {
  name: 'Tool — The Grudge (intro) [code]',
  bpm: 98,
  patterns,
  arrangement: patterns.map(p => ({ pattern: p.name })),
  humanize: {
    timing: 0.012,
    velocity: 6,
    timingBias: -0.15,
  },
}

export default song
