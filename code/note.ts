// Canonical drum-note map. MIDI note numbers, kept in one place
// so patterns reference names instead of magic ints.
//
// Source of truth: cluesurf/note/music/drums/sd3-midi-mapping-v2.md
// That doc is the actual auto-generated SD3 mapping captured from
// the Danny Carey replication kit (13 pieces, Sonor SQ2 toms,
// Tama Bell Brass snare, Paiste 2002 cymbals, etc.).
//
// Pre-v2 versions of this file used the General MIDI 1990
// standard. SD3's actual mapping is much richer:
//
//   1. SD3 articulation vocabulary is bigger than GM (8 snare
//      articulations vs GM's 3, etc).
//   2. SD3 spreads articulations across the full 0-127 range, not
//      just GM's 35-81 zone.
//   3. The Danny kit has 6 cymbal slots + 2 chinas + spock + splash,
//      where GM only knows Crash 1 / Crash 2.
//   4. SD3 includes Zone / Tip / Edge trigger notes for e-drum
//      hardware — inert when playing from a keyboard or DAW.
//
// When in doubt, open SD3 → Settings → MIDI In/E-Drums → Mapping
// to see what each note triggers in the currently loaded kit.

// ---------------------------------------------------------------
// MIDI channel
// ---------------------------------------------------------------
//
// MIDI uses 0-indexed channels in the wire protocol; humans
// label them 1-16. The General MIDI convention is channel 10
// (index 9) for drums, but Ableton's default MIDI track receives
// on Ch. 1 (index 0), and SD3 inside Ableton is typically routed
// that way. So the lean default is **channel 0 = Ableton Ch. 1**.
//
// If your SD3 track is set to receive on Ch. 10 instead, change
// this to 9.

export const DRUM_CHANNEL = 0

// ---------------------------------------------------------------
// NOTE — flat lookup table used by patterns
// ---------------------------------------------------------------
//
// Names follow the semantic convention used by pattern files
// (kick, snare, closedHat, tomHigh, crashLeft, ride, etc.).
// MIDI numbers reflect the v2 mapping captured from SD3.
//
// Where v2 provides multiple notes for the same articulation
// (e.g. Snare Center appears on notes 38, 66, 68, 70, 125), this
// table chooses the lowest GM-standard note as the canonical one
// and leaves the duplicates accessible via the *Alt suffixes.

export const NOTE = {
  // Kick (v2: "Kick: Right" on 34, 35, 36) -------------------
  kickAltLow: 34,          // alternate trigger
  kickAlt: 35,             // alternate trigger
  kick: 36,                // primary kick

  // Snare (v2: Center/Rimshot/Sidestick/Edge/Flam/Closed Roll
  // /Rim Only/Zone Trigger across 33, 37, 38, 39, 40, 66-71,
  // 125-127) ------------------------------------------------
  snareZoneTrigger: 6,     // e-drum zone trigger (inert from DAW)
  snareEdge: 33,           // edge hit
  snareSidestick: 37,      // cross-stick
  snare: 38,               // primary snare hit (Center)
  snareRoll: 39,           // Closed Roll
  snareRim: 40,            // rimshot — full hit with rim
  snareCenterAlt1: 66,     // duplicate of Snare Center
  snareSidestickAlt: 67,   // duplicate of Sidestick
  snareCenterAlt2: 68,     // duplicate of Snare Center
  snareFlam: 69,           // flam articulation
  snareCenterAlt3: 70,     // duplicate of Snare Center
  snareRimOnly: 71,        // rim-only (no head)
  snareCenterHigh: 125,    // top-octave duplicate of Center
  snareRimHigh: 126,       // top-octave duplicate of Rimshot
  snareSidestickHigh: 127, // top-octave duplicate of Sidestick
  // Compat alias for pattern files that still reference
  // NOTE.snareGhost — map to Center; ghost-feel is achieved via
  // low velocity in drum.ts (typically 25-40).
  snareGhost: 38,

  // Hi-hat (v2: huge articulation set across 7-26, 42, 44, 46,
  // 60-65, 119-124) -----------------------------------------
  // Low-zone e-drum triggers
  hiHatEdgeTrigger: 7,
  hiHatTipTrigger: 8,
  hiHatTipTriggerAlt: 9,
  // Closed/pedal/open variants in the 10-17 zone
  hiHatClosedPedal: 10,    // pedal-closed, struck
  hiHatClosedEdge: 11,     // closed, struck on edge
  hiHatOpen0: 12,          // openness step 0 (just-cracked)
  hiHatOpen1: 13,
  hiHatOpen2: 14,
  hiHatOpen3: 15,
  hiHatOpen4: 16,
  hiHatOpen5: 17,          // fully open
  hiHatEdgeTriggerAlt: 18,
  hiHatTipTriggerAlt2: 19,
  hiHatTipTriggerAlt3: 20,
  // Duplicates of Closed/Open across 21-26
  hiHatClosedPedalAlt: 21,
  hiHatClosedEdgeAlt: 22,
  hiHatOpenPedal: 23,      // pedal-open splash
  hiHatOpen1Alt: 24,
  hiHatOpen2Alt: 25,
  hiHatOpen3Alt: 26,
  // GM-standard hi-hat notes
  closedHat: 42,           // GM "Closed Hi-Hat" — main closed (Closed Tip)
  pedalHat: 44,            // GM "Pedal Hi-Hat" — chick
  openHat: 46,             // GM "Open Hi-Hat" — main open (Open 2)
  // Mid-zone Tight + Seq articulations
  hiHatOpen4Alt: 60,
  hiHatClosedTipAlt: 61,
  hiHatTightEdge: 62,
  hiHatTightTip: 63,
  hiHatOpen0Alt: 64,
  hiHatSeqHits: 65,
  // Top-octave duplicates
  hiHatClosedTipHigh: 119,
  hiHatOpen1High: 120,
  hiHatOpen3High: 121,
  hiHatClosedEdgeHigh: 122,
  hiHatOpen0High: 123,
  hiHatOpen5High: 124,

  // Toms (v2: Racktom 1-3 Center on 48/47/45, Floortom 1-2
  // Center on 43/41, with rimshot pairs on 73-82) ---------
  floorTomLow: 41,         // Floortom 2 Center (low floor)
  floorTom: 43,            // Floortom 1 Center (high floor)
  tomLow: 45,              // Racktom 3 Center (14")
  tomMid: 47,              // Racktom 2 Center (12")
  tomHigh: 48,             // Racktom 1 Center (10")
  // Duplicates for fast fills
  floorTomLowAlt: 72,
  floorTomAlt: 74,
  tomLowAlt: 78,
  tomMidAlt: 80,
  tomHighAlt: 81,
  // Tom rims
  floorTomLowRim: 73,      // Floortom 2 Rimshot
  floorTomRim: 75,         // Floortom 1 Rimshot
  tomLowRim: 77,           // Racktom 3 Rimshot
  tomMidRim: 79,           // Racktom 2 Rimshot
  tomHighRim: 82,          // Racktom 1 Rimshot

  // Cymbal slots (the Danny kit has Cymbal 1-6 + China 1-2 +
  // Spock + Splash, each with a Crash + Mute Hit pair) -----
  // Semantic crash names (point to specific Cymbal N slots).
  //
  // IMPORTANT: SD3's "Cymbal 1" is the cymbal you added FIRST to
  // the kit. Per kit-picks.md that's Crash 1 (18", smaller, sits
  // on the left ergonomically). Cymbal 2 is Crash 2 (20", larger,
  // sits on the right). So crashLeft = Cymbal 1, crashRight = Cymbal 2.
  // Cymbal 5 (note 57) is empty in the current kit and was the
  // OLD GM-flavored target for crashRight — that's why crashes
  // sounded wrong/missing.
  crashLeft: 28,           // = Cymbal 1 Crash (Crash 1, 18" smaller)
  crashLeftChoke: 94,      // = Cymbal 1 Mute Hit
  crashRight: 49,          // = Cymbal 2 Crash (Crash 2, 20" larger)
  crashRightChoke: 50,     // = Cymbal 2 Mute Hit
  // Individual cymbal slot access
  cymbal1Crash: 28,        // = Crash 1 (18") in kit-picks
  cymbal1Mute: 94,
  cymbal2Crash: 49,        // = Crash 2 (20") in kit-picks
  cymbal2Mute: 50,
  cymbal3Crash: 30,
  cymbal3Mute: 95,
  cymbal4Crash: 31,
  cymbal4Mute: 106,
  cymbal5Crash: 57,
  cymbal5Mute: 58,
  cymbal6Crash: 32,
  cymbal6Mute: 107,
  // China (semantic = China 2 to match GM note 52; China 1 via alias)
  china: 52,               // = China 2 Crash
  chinaChoke: 54,          // = China 2 Mute Hit
  china1Crash: 27,
  china1Mute: 83,
  china2Crash: 52,
  china2Mute: 54,
  // Splash
  splash: 55,              // = Splash Crash
  splashChoke: 56,         // = Splash Mute Hit
  // Spock (stacked cymbal, e.g. 12"/14" Meinl X-treme Stack)
  spockCrash: 29,
  spockMute: 76,

  // Ride (v2: Bow Tip / Bow Shank / Bell Tip / Bell Shank /
  // Edge / Mute Hit across 51-118, many duplicates) -------
  //
  // rideBell is intentionally aliased to Ride Bell TIP (note 88),
  // not Bell Shank (note 53). The Bell Tip is the iconic sharp
  // pingy ride bell that Danny's catalog is built on. Bell Shank
  // is the heavier "clunk" sound — available as rideBellShank.
  rideTip: 51,             // Ride Bow Tip (primary)
  rideBell: 88,            // Ride Bell Tip (sharp ping)
  rideEdge: 59,            // Ride Edge
  rideBowShank: 84,
  rideBellShank: 53,       // alt: Ride Bell Shank (heavier "clunk")
  rideBellTip: 88,         // alias — same as rideBell
  rideMuteHit: 118,        // Ride Mute Hit (choke)
  rideChoke: 118,          // alias — same articulation
} as const

export type NoteName = keyof typeof NOTE

// ---------------------------------------------------------------
// Notes on the table above
// ---------------------------------------------------------------
//
// 1. The Danny kit's SD3 mapping does NOT follow GM exactly. Notes
//    50, 54, 56, 58, 65-70 (GM aux percussion / FX zone) are
//    occupied by cymbal Mute Hits and snare/hat duplicates. The
//    GM aux percussion block (tambourine, cowbell, bongos, etc.)
//    is therefore NOT available in this kit. Pattern files that
//    need those sounds must route to a separate SD3 instance with
//    a percussion library loaded.
//
// 2. The high-zone duplicates (notes 119-127 for snare/hat) exist
//    so MIDI keyboards can play the kit from the top octave
//    without reaching down to the GM zone. Patterns that compose
//    in the top range can use these directly.
//
// 3. snareGhost is aliased to NOTE.snare (note 38). The Tama Bell
//    Brass in this kit has no separate "Ghost" articulation —
//    ghost-feel is achieved via low velocity (25-40) in drum.ts.
//
// 4. Choke notes (cymbal1Mute ... rideMuteHit) are explicit Mute
//    Hit articulations. They work alongside the Choke/Mute
//    Trigger panel's Note Off mode — either approach chokes.
//
// 5. crashLeft / crashRight / china / splash semantic names map
//    to specific Cymbal N slots based on the kit picks doc. If
//    you reorder cymbals in SD3, update the numeric values here
//    rather than in every pattern file.
