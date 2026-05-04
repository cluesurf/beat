// Drumkit defaults — the line + instrument + articulation
// definitions used when the tab front matter has
// `instrument: drumkit`.
//
// Override anything in front matter:
//
//   HH:
//     velocity: [60, 80]
//     o: { hit: pedal }    # makes `o` on hi-hat a foot-chick
//
// Add new line names:
//
//   GG:
//     instrument: tom-1     # alias an existing instrument
//     x: { note: 50 }       # override the note for `x` on this line

import { NOTE } from '../note'
import type { InstrumentDef, LineDef, NoteSpec } from './types'

// ---------------------------------------------------------------
// Articulation maps per instrument
// ---------------------------------------------------------------

export const DRUMKIT_INSTRUMENTS: Record<string, InstrumentDef> = {
  hihat: {
    name: 'hihat',
    articulations: {
      closed: NOTE.closedHat,
      open: NOTE.openHat,
      pedal: NOTE.pedalHat,
      foot: NOTE.pedalHat,
    },
    defaultArticulation: 'closed',
    defaultVelocity: 78,
    notes: {
      x: { hit: 'closed' },
      o: { hit: 'open' },
      O: { hit: 'open', velocity: 115 },
      X: { hit: 'closed', velocity: 110 },
      d: { hit: 'closed', velocity: 60 },
      g: { hit: 'closed', velocity: 30 },
      r: { hit: 'closed', velocity: 70 },
    },
  },

  'hihat-pedal': {
    name: 'hihat-pedal',
    articulations: { pedal: NOTE.pedalHat },
    defaultArticulation: 'pedal',
    defaultVelocity: 90,
    notes: { x: { hit: 'pedal' } },
  },

  snare: {
    name: 'snare',
    articulations: {
      wired: NOTE.snare,
      ghost: NOTE.snareGhost,
      rim: NOTE.snareRim,
      'rim-only': NOTE.snareRimOnly,
      sidestick: NOTE.snareSidestick,
      roll: NOTE.snareRoll,
    },
    defaultArticulation: 'wired',
    defaultVelocity: 95,
    notes: {
      x: { hit: 'wired' },
      X: { hit: 'wired', velocity: 118 },
      o: { hit: 'ghost', velocity: 30 },
      O: { hit: 'ghost', velocity: 80 },
      'x́': { hit: 'rim', velocity: 100 },
      'X́': { hit: 'rim', velocity: 120 },
      'x̃': { hit: 'roll', velocity: 80 },
      f: { hit: 'wired', velocity: 105, flam: 0.04 },
      g: { hit: 'ghost', velocity: 25 },
      d: { hit: 'wired', velocity: 60 },
      r: { hit: 'roll', velocity: 70 },
    },
  },

  kick: {
    name: 'kick',
    articulations: { main: NOTE.kick, alt: NOTE.kickAlt },
    defaultArticulation: 'main',
    defaultVelocity: 100,
    notes: {
      x: { hit: 'main' },
      o: { hit: 'main' },
      O: { hit: 'main', velocity: 120 },
      d: { hit: 'main', velocity: 60 },
      g: { hit: 'main', velocity: 30 },
      f: { hit: 'main', velocity: 105, flam: 0.04 },
    },
  },

  'tom-1': singleArticulationTom('tom-1', NOTE.tomHigh),
  'tom-2': singleArticulationTom('tom-2', NOTE.tomMid),
  'tom-3': singleArticulationTom('tom-3', NOTE.tomLow),
  'tom-4': singleArticulationTom('tom-4', NOTE.floorTom),
  'tom-5': singleArticulationTom('tom-5', NOTE.floorTomLow),

  'crash-1': cymbal('crash-1', NOTE.crashLeft, NOTE.crashLeftChoke),
  'crash-2': cymbal('crash-2', NOTE.crashRight, NOTE.crashRightChoke),
  china: cymbal('china', NOTE.china, NOTE.chinaChoke),
  splash: cymbal('splash', NOTE.splash, NOTE.splashChoke),

  ride: {
    name: 'ride',
    articulations: {
      tip: NOTE.rideTip,
      bell: NOTE.rideBell,
      edge: NOTE.rideEdge,
      choke: NOTE.rideChoke,
    },
    defaultArticulation: 'tip',
    defaultVelocity: 90,
    notes: {
      x: { hit: 'tip' },
      X: { hit: 'tip', velocity: 120 },
      b: { hit: 'bell', velocity: 105 },
      O: { hit: 'tip', velocity: 115 },
      c: { hit: 'choke', velocity: 1 },
      g: { hit: 'tip', velocity: 30 },
      d: { hit: 'tip', velocity: 60 },
      r: { hit: 'tip', velocity: 70 },
    },
  },
}

function singleArticulationTom(
  name: string,
  note: number,
): InstrumentDef {
  return {
    name,
    articulations: { main: note },
    defaultArticulation: 'main',
    defaultVelocity: 95,
    notes: {
      x: { hit: 'main' },
      o: { hit: 'main' },
      O: { hit: 'main', velocity: 118 },
      f: { hit: 'main', velocity: 105, flam: 0.04 },
      g: { hit: 'main', velocity: 30 },
      d: { hit: 'main', velocity: 60 },
    },
  }
}

function cymbal(
  name: string,
  hit: number,
  choke: number,
): InstrumentDef {
  return {
    name,
    articulations: { main: hit, choke },
    defaultArticulation: 'main',
    defaultVelocity: 100,
    notes: {
      x: { hit: 'main' },
      X: { hit: 'main', velocity: 120 },
      O: { hit: 'main', velocity: 120 },
      c: { hit: 'choke', velocity: 1 },
      g: { hit: 'main', velocity: 30 },
      d: { hit: 'main', velocity: 60 },
      r: { hit: 'main', velocity: 70 },
    },
  }
}

// ---------------------------------------------------------------
// Default lines
// ---------------------------------------------------------------
//
// Each line maps to an instrument. Songs can use these names
// directly without front-matter declaration.

export const DRUMKIT_LINES: Record<string, LineDef> = {
  K: line('kick'),
  S: line('snare'),
  H: line('hihat'),
  HH: line('hihat'),
  Hp: line('hihat-pedal'),
  T1: line('tom-1'),
  T2: line('tom-2'),
  T3: line('tom-3'),
  T4: line('tom-4'),
  T5: line('tom-5'),
  C: line('crash-1'),
  C1: line('crash-1'),
  C2: line('crash-2'),
  R: line('ride'),
  R1: line('ride'),
  X: line('china'),
  L: line('splash'),
}

function line(instrument: string): LineDef {
  return { instrument, notes: {} }
}

// ---------------------------------------------------------------
// Note resolution
// ---------------------------------------------------------------
//
// Walks: line.notes → instrument.notes → instrument default
// articulation. Returns undefined if the character isn't defined
// at any level (parser will throw with a helpful message).

export function resolveNoteSpec(
  char: string,
  lineDef: LineDef,
  instrumentDef: InstrumentDef,
  globalNotes: Record<string, NoteSpec>,
): NoteSpec | undefined {
  return (
    lineDef.notes[char] ??
    instrumentDef.notes[char] ??
    globalNotes[char]
  )
}
