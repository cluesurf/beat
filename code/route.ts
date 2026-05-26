// MIDI routing: which IAC port (bus) and which channel each
// drum/instrument lands on.
//
// Two independent axes:
//
//   - PORT (bus): a named IAC virtual MIDI port. The lean setup
//     uses ONE port; the deep 4-family rig uses four (kit / world
//     / cinematic / electronic), so each family can host its own
//     DAW tracks/plugins.
//
//   - CHANNEL: within a port, the MIDI channel (0-15 on the wire;
//     humans say 1-16). Per-piece channels let one SD3 instance —
//     or separate tracks — receive kick on one channel, snare on
//     another, for individual mixing.
//
// Both are OPTIONAL on a Hit. Unset → the engine falls back to a
// single default port + `DRUM_CHANNEL`, which is the lean setup
// (one SD3 track, all pieces mapped by note). Nothing here changes
// that default; multi-port/multi-channel is opt-in.

// ---------------------------------------------------------------
// Ports (IAC buses)
// ---------------------------------------------------------------
//
// Values are SUBSTRING fragments matched against the system's MIDI
// output names (so "Kit" matches "IAC Driver (Kit)"). Create these
// in macOS Audio MIDI Setup → MIDI Studio → IAC Driver.
//
// KIT defaults to "TS Drum Engine" — the existing lean port name —
// so current setups keep working untouched. Rename via these
// constants if your IAC ports use different names.

export const BUS = {
  KIT: 'TS Drum Engine',
  WORLD: 'IAC Driver (World)',
  CINEMATIC: 'IAC Driver (Cinematic)',
  ELECTRONIC: 'IAC Driver (Electronic)',
} as const

export type Bus = (typeof BUS)[keyof typeof BUS]

// The port a Hit routes to when it doesn't set one.
export const DEFAULT_BUS: string = BUS.KIT

// ---------------------------------------------------------------
// Channels (0-indexed wire values)
// ---------------------------------------------------------------
//
// IMPORTANT: these are 0-INDEXED (the MIDI wire protocol, what
// easymidi wants), matching `DRUM_CHANNEL = 9`. The number you
// pick in Ableton's "MIDI From → Ch." dropdown is value + 1.
// So `KIT_CHANNEL.KICK = 0` ⟷ Ableton "Ch. 1".
//
// Human channel 10 (index 9) is GM's drum channel and is skipped
// in the per-piece maps to avoid GM remapping surprises — it
// remains `DRUM_CHANNEL` for the lean by-note setup.

export const KIT_CHANNEL = {
  KICK: 0, // Ableton Ch. 1
  SNARE: 1, // Ch. 2
  HI_HAT: 2, // Ch. 3
  TOM_1: 3, // Ch. 4
  TOM_2: 4, // Ch. 5
  TOM_3: 5, // Ch. 6
  TOM_4: 6, // Ch. 7
  TOM_5: 7, // Ch. 8
  RIDE: 8, // Ch. 9
  CRASH_1: 10, // Ch. 11 (skip index 9 = GM drums)
  CRASH_2: 11, // Ch. 12
  CHINA: 12, // Ch. 13
  SPLASH: 13, // Ch. 14
} as const

export const WORLD_CHANNEL = {
  TABLA: 0,
  PAKHAWAJ: 1,
  MRIDANGAM: 2,
  DOUMBEK: 3,
  FRAME_DRUM: 4,
  RIQ: 5,
  DJEMBE: 6,
  CAJON: 7,
  UDU: 8,
  SHAKERS: 10,
  BONGOS: 11,
  CONGAS: 12,
  TIMBALES: 13,
  BERIMBAU: 14,
  MISC_PERC: 15,
} as const

export const CINEMATIC_CHANNEL = {
  TAIKO: 0,
  SURDO: 1,
  DAMAGE_TRIBAL: 2,
  DAMAGE_IMPACTS: 3,
  TIBETAN_BOWLS: 4,
  CROTALES: 5,
  MARK_TREE: 6,
  GONGS: 7,
  TAM_TAM: 8,
  BELL_TREE: 10,
  TUBULAR_BELLS: 11,
  GLOCKENSPIEL: 12,
  MARIMBA: 13,
  VIBRAPHONE: 14,
} as const

export const ELECTRONIC_CHANNEL = {
  SUB_KICK: 0,
  INDUSTRIAL_SNARE: 1,
  GLITCH_HI_HAT: 2,
  VICARIOUS_PULSE: 3,
  PAD_DRONE: 4,
  GRANULAR: 5,
} as const

// A fully-resolved route. Either field may be omitted to inherit
// the default.
export type Route = {
  port?: string
  channel?: number
}
