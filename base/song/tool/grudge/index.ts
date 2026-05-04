// Tool — "The Grudge" intro (16 bars).
//
// Source: drum tab pasted in chat (decoded directly into hits).
//
// Setup:
//
//   - Time signature: 5/8 (5 eighth notes per bar)
//   - Tempo: ♩ = 98 (quarter note)
//   - Voices in the tab → SD3 mapping:
//
//       Letter  Tab notation    NOTE constant       Drum
//       ──────  ─────────────   ─────────────────   ─────────────────
//       T       rack tom        NOTE.tomMid         main rack tom
//       t       small tom       NOTE.tomHigh        smallest rack tom
//       f       floor tom       NOTE.floorTom       small floor tom
//       F       Floor tom       NOTE.floorTomLow    large floor tom
//       B       bass drum       NOTE.kick           kick
//       S       snare           NOTE.snare          snare (wires on)
//       C       crash           NOTE.crashLeft      crash
//       R       ride            NOTE.rideTip        ride bow
//       H       hi-hat          NOTE.closedHat      hi-hat
//       Hf      hi-hat foot     NOTE.pedalHat       hat-pedal chick
//       I       china           NOTE.china          china
//
// Tab grid: each character is one 16th note. A 5/8 bar = 10
// sixteenths = exactly 10 columns wide, with the row label
// `1+2+3+4+5+`. In our beat units (1 beat = quarter note), one
// 16th = 0.25 beats, so a 5/8 bar = 2.5 beats.
//
// Tab character meanings:
//
//   -   silence
//   o   normal hit
//   O   accented hit (louder)
//   X   accented cymbal
//   x   soft cymbal hit (closed hat / ride bow)
//   d   drag / muted (soft)
//   f   flam (adds a quick grace note before)
//   g   ghost note (very soft)
//   b   ride bell
//   r   buzz / ruff

import type { Hit, Pattern, Song } from '@/code/song'
import { NOTE } from '@/code/note'

// ---------------------------------------------------------------
// Parser — turn tab strings into Hit[]
// ---------------------------------------------------------------

const VOICE: Record<string, number> = {
  T: NOTE.tomMid,
  t: NOTE.tomHigh,
  f: NOTE.floorTom,
  F: NOTE.floorTomLow,
  B: NOTE.kick,
  S: NOTE.snare,
  C: NOTE.crashLeft,
  R: NOTE.rideTip,
  H: NOTE.closedHat,
  Hf: NOTE.pedalHat,
  I: NOTE.china,
}

const VELOCITY: Record<string, number> = {
  o: 95,
  O: 118,
  X: 120,
  x: 78,
  d: 60,
  g: 30,
  f: 105,
  r: 70,
  b: 105,
}

const FLAM_OFFSET = 0.04

function parseBar(rows: Record<string, string>, spacing: number): Hit[] {
  const out: Hit[] = []
  for (const [letter, line] of Object.entries(rows)) {
    const baseNote = VOICE[letter]
    if (baseNote === undefined) {
      throw new Error(`Unknown voice "${letter}" in tab`)
    }
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === undefined || ch === '-' || ch === ' ') continue
      const velocity = VELOCITY[ch] ?? 95
      const beat = i * spacing
      // 'b' on the ride row = bell, swap note.
      const note = ch === 'b' && letter === 'R' ? NOTE.rideBell : baseNote
      out.push({ beat, note, velocity })
      // Flam = soft grace note before the main hit.
      if (ch === 'f') {
        out.push({ beat: beat - FLAM_OFFSET, note: baseNote, velocity: 50 })
      }
    }
  }
  return out.sort((a, b) => a.beat - b.beat)
}

// ---------------------------------------------------------------
// Intro — 16 bars of 5/8
// ---------------------------------------------------------------
//
// f / F / B repeat identically every bar. Only T (rack tom)
// varies. There are 6 unique tom shapes across the 16 bars,
// labeled A..F here. The arrangement at the bottom plays them
// in the right order to total 16 bars.
//
// Tab columns: |1+2+3+4+5+|

const FOOT  = '-----O--O-' // small floor tom — accents on "+ of 3" and "+ of 4"
const FLOOR = 'o--o------' // big floor tom — beats 1 and "+ of 2"
const BASS  = 'o--o-o--o-' // kick — 1, "+ of 2", 3, "+ of 4"

function introBar(tomLine: string): Hit[] {
  return parseBar(
    { T: tomLine, f: FOOT, F: FLOOR, B: BASS },
    0.25, // each char = a 16th note
  )
}

// Six unique tom-line shapes used across the 16-bar intro.
const TOM_A = '-oo----o-o' // bar 1
const TOM_B = '-oo-o-oo-o' // bar 2
const TOM_C = '--o---oo--' // bar 3
const TOM_D = '-oo---oo-o' // bars 4, 5, 9-15  (the "main" intro shape)
const TOM_E = '-oo---oo--' // bars 6, 8, 16
const TOM_F = '--o---oo-o' // bar 7

const introA: Pattern = { name: 'intro-A', beats: 2.5, hits: introBar(TOM_A) }
const introB: Pattern = { name: 'intro-B', beats: 2.5, hits: introBar(TOM_B) }
const introC: Pattern = { name: 'intro-C', beats: 2.5, hits: introBar(TOM_C) }
const introD: Pattern = { name: 'intro-D', beats: 2.5, hits: introBar(TOM_D) }
const introE: Pattern = { name: 'intro-E', beats: 2.5, hits: introBar(TOM_E) }
const introF: Pattern = { name: 'intro-F', beats: 2.5, hits: introBar(TOM_F) }

// ---------------------------------------------------------------
// Song
// ---------------------------------------------------------------

const song: Song = {
  name: 'Tool — The Grudge (intro)',
  bpm: 98,
  patterns: [introA, introB, introC, introD, introE, introF],
  arrangement: [
    { pattern: 'intro-A' },             // bar 1
    { pattern: 'intro-B' },             // bar 2
    { pattern: 'intro-C' },             // bar 3
    { pattern: 'intro-D', repeat: 2 },  // bars 4-5
    { pattern: 'intro-E' },             // bar 6
    { pattern: 'intro-F' },             // bar 7
    { pattern: 'intro-E' },             // bar 8
    { pattern: 'intro-D', repeat: 7 },  // bars 9-15
    { pattern: 'intro-E' },             // bar 16
  ],
  // Slight drag + jitter so the 16 repetitions don't sound like
  // a drum machine. Carey sits behind the click.
  humanize: {
    timing: 0.012,
    velocity: 6,
    timingBias: -0.15,
  },
}

export default song
