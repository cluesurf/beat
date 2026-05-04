// Canonical drum-note map. General-MIDI percussion numbers,
// kept in one place so patterns reference names instead of
// magic ints.

export const NOTE = {
  kick: 36,
  snare: 38,
  snareRim: 40,

  tomHigh: 48,
  tomMid: 47,
  tomLow: 45,
  floorTom: 43,
  floorTomLow: 41,

  closedHat: 42,
  openHat: 46,

  rideTip: 51,
  rideBell: 53,

  crashLeft: 49,
  crashRight: 57,
  china: 52,

  fxMetal: 80,
  fxBoom: 81,
} as const

// MIDI uses 0-indexed channels in the wire protocol; humans
// label them 1-16. Drums conventionally live on channel 10
// (which is index 9 here).
export const DRUM_CHANNEL = 9
