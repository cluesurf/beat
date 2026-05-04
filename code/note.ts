// Canonical drum-note map. MIDI note numbers, kept in one place
// so patterns reference names instead of magic ints.
//
// Layout follows the **Superior Drummer 3 Core Library default
// mapping** (Toontrack's extension of General MIDI). When in
// doubt, open SD3 → Settings → MIDI In/E-Drums → Mapping to see
// what each note triggers in the currently loaded kit.
//
// The SD3 Core Library exposes far more than GM's 47 percussion
// notes — typically 100+ articulations per kit. They're grouped
// by drum below: each drum's main hit comes first, then its
// variants (rim, ghost, edge, choke, etc.).

// ---------------------------------------------------------------
// MIDI channel
// ---------------------------------------------------------------
//
// MIDI uses 0-indexed channels in the wire protocol; humans
// label them 1-16. Drums conventionally live on channel 10
// (which is index 9 here).

export const DRUM_CHANNEL = 9

// ---------------------------------------------------------------
// NOTE — flat lookup table used by patterns
// ---------------------------------------------------------------
//
// Sorted by MIDI note number ascending within each section. Most
// patterns only need the "main" entry per drum (kick, snare,
// closedHat, tomHigh, crashLeft, ride). The variant articulations
// are there for when you want fills with rim ghosts, hi-hat
// openness sweeps, ride bell ostinatos, choked crashes, etc.

export const NOTE = {
  // Kick ------------------------------------------------------
  kickAlt: 35,             // GM "Acoustic Bass Drum" — second kick zone
  kick: 36,                // GM "Bass Drum 1" — main kick

  // Snare -----------------------------------------------------
  snareSidestick: 37,      // cross-stick / sidestick
  snare: 38,               // main snare hit
  snareHandClap: 39,       // hand clap (or some kits: rim click)
  snareRim: 40,            // rimshot — full hit with rim contact
  snareRimOnly: 91,        // rim-only (no head)
  snareGhost: 92,          // soft ghost note (Core extension)
  snareFlam: 93,           // flam articulation
  snareDrag: 94,           // drag articulation
  snareRoll: 95,           // buzz roll trigger

  // Hi-hat (lots of variants — closed → open continuum) ------
  hiHatTipClosed: 22,      // tip on bow, fully closed
  hiHatTipOpen: 26,        // tip on bow, slightly open
  hiHatClosedPedal: 10,    // pedal-closed, struck
  hiHatClosedEdge: 11,     // closed, struck on edge
  hiHatOpen0: 12,          // openness step 0 (just-cracked)
  hiHatOpen1: 13,
  hiHatOpen2: 14,
  hiHatOpen3: 15,
  hiHatOpen4: 16,
  hiHatOpen5: 17,          // fully open
  hiHatEdgeTrigger: 18,    // edge-only articulation trigger
  hiHatTipTrigger: 19,
  hiHatTipTriggerAlt: 20,
  closedHat: 42,           // GM "Closed Hi-Hat" — main closed hit
  pedalHat: 44,            // GM "Pedal Hi-Hat" — chick
  openHat: 46,             // GM "Open Hi-Hat" — main open hit

  // Toms (low → high; SD3 Core ships ≥ 6 tom slots) ----------
  floorTomLow: 41,         // GM "Low Floor Tom"
  floorTom: 43,            // GM "High Floor Tom"
  tomLow: 45,              // GM "Low Tom"
  tomMid: 47,              // GM "Low-Mid Tom"
  tomHigh: 48,             // GM "Hi-Mid Tom"
  // Note 50 — GM calls this "High Tom" but SD3 Core's default
  // map uses it for an extra crash on this kit (verified by
  // ear). Kit-dependent; check Settings → MIDI In/E-Drums →
  // Mapping if a different kit gives a different sound.
  crashExtra: 50,

  // Tom rims (Core articulation extension) -------------------
  floorTomLowRim: 65,
  floorTomRim: 66,
  tomLowRim: 67,
  tomMidRim: 68,
  tomHighRim: 69,
  // 70 was tomXHighRim under GM — kit-dependent, verify by ear.
  rim70: 70,

  // Cymbals --------------------------------------------------
  crashLeft: 49,           // GM "Crash Cymbal 1"
  rideTip: 51,             // GM "Ride Cymbal 1" — tip on bow
  china: 52,               // GM "Chinese Cymbal"
  rideBell: 53,            // GM "Ride Bell"
  splash: 55,              // GM "Splash Cymbal"
  crashRight: 57,          // GM "Crash Cymbal 2"
  rideEdge: 59,            // GM "Ride Cymbal 2" — edge / crash-ride
  crashLeftChoke: 71,      // velocity-1 also chokes; this is explicit
  crashRightChoke: 72,
  chinaChoke: 73,
  splashChoke: 74,
  rideChoke: 75,

  // Auxiliary percussion (GM standard) -----------------------
  // Notes 65-75 collide with tom rims and cymbal chokes above.
  // SD3 routes them based on the loaded kit: drum kits play
  // tom rims / chokes, percussion kits play these. Use a
  // separate SD3 instance on its own channel for percussion.
  tambourine: 54,
  cowbell: 56,
  vibraslap: 58,
  highBongo: 60,
  lowBongo: 61,
  muteHighConga: 62,
  openHighConga: 63,
  lowConga: 64,
  // 65 highTimbale / 66 lowTimbale — see note above; use
  //   floorTomLowRim / floorTomRim from the tom-rim block.
  highWoodBlock: 76,
  lowWoodBlock: 77,
  muteCuica: 78,
  openCuica: 79,
  muteTriangle: 80,
  openTriangle: 81,

  // FX / extras (SD3 Core extension above GM range) ----------
  fxMetal: 82,             // metal hit / industrial fx
  fxBoom: 83,              // sub-boom / impact
  fxRise: 84,              // riser
  fxReverse: 85,           // reverse hit
} as const

export type NoteName = keyof typeof NOTE

// ---------------------------------------------------------------
// Notes on the table above
// ---------------------------------------------------------------
//
// 1. Numbers 41–50 are the GM tom range. SD3 Core preserves it,
//    so any GM-aware DAW + sampler combo will sound the right
//    drums even if you're not in SD3.
//
// 2. The hi-hat block (10–22, 26, 42, 44, 46) is SD3-specific.
//    The high notes (42 / 44 / 46) are the "GM-facing" hits
//    everyone knows. The low notes (10–22) are the per-openness
//    articulations SD3 exposes for nuanced hat work — the kind
//    visible in the screenshot's "etch-hihats" mapping preset.
//
// 3. Tom rims (65–70) overlap with GM aux percussion (timbales,
//    agogos). SD3 Core resolves this by KIT: drum kits map those
//    notes to tom rims, percussion kits map them to perc. If you
//    need both in one project, use two SD3 instances on different
//    channels.
//
// 4. Choke notes (71–75) are an explicit alternative to the
//    "velocity 1 = choke" trick. Use whichever the loaded kit
//    is configured for.
//
// 5. FX (82–85) are above the GM range and are unique to SD3 +
//    some SDXs (e.g. Death & Darkness). Will be silent on GM
//    samplers.
