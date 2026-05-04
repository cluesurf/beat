// 5/4 Tool-style example.
//
// Built around a 5-beat ostinato — every bar is 5 beats long
// (instead of 4), so the snare backbeat lands on 2 and 4 like
// usual, but the bar takes an extra beat to resolve. That
// "where's the one?" disorientation is most of the Tool
// flavor.
//
// Five patterns:
//
//   intro   — sparse: kick + closed hat, no snare. Sets the
//             5-count groove without committing.
//
//   verse   — closed hat 8ths, kick on 1 / 3.5 / 5, snare on
//             2 / 4, ghost notes filling the gaps. Beat 5 is
//             a wind-up tom into the next bar's downbeat.
//
//   chorus  — opens up. Crash on 1 + 4, descending tom melody
//             through the second half (mid → low → floor →
//             floor-low). Beat 5 = full Carey-shape fill.
//
//   bridge  — ride bell ostinato + sub boom on beat 5. Quieter,
//             lets the kick + boom interplay carry the weight
//             while the cymbals shimmer.
//
//   outro   — single layered crash on the downbeat. Lets the
//             room ring out.
//
// Arrangement: intro → verse × 4 → chorus × 2 → verse × 4
//              → bridge × 4 → chorus × 4 → outro.

import type { Song } from '@/code/song'
import { NOTE } from '@/code/note'

const intro = {
  name: 'intro',
  beats: 5,
  hits: [
    { beat: 0, note: NOTE.kick, velocity: 95 },
    { beat: 0, note: NOTE.crashLeft, velocity: 80 },
    { beat: 1, note: NOTE.closedHat, velocity: 60 },
    { beat: 2, note: NOTE.kick, velocity: 85 },
    { beat: 2, note: NOTE.closedHat, velocity: 60 },
    { beat: 3, note: NOTE.closedHat, velocity: 60 },
    { beat: 4, note: NOTE.kick, velocity: 85 },
    { beat: 4, note: NOTE.closedHat, velocity: 60 },
  ],
}

const verse = {
  name: 'verse',
  beats: 5,
  hits: [
    // beat 1 — downbeat
    { beat: 0, note: NOTE.kick, velocity: 115 },
    { beat: 0, note: NOTE.closedHat, velocity: 80 },
    { beat: 0.5, note: NOTE.closedHat, velocity: 55 },

    // beat 2 — backbeat
    { beat: 1, note: NOTE.snare, velocity: 118 },
    { beat: 1, note: NOTE.closedHat, velocity: 75 },
    { beat: 1.5, note: NOTE.snareRim, velocity: 35 }, // ghost
    { beat: 1.5, note: NOTE.closedHat, velocity: 55 },

    // beat 3
    { beat: 2, note: NOTE.closedHat, velocity: 75 },
    { beat: 2.5, note: NOTE.kick, velocity: 100 },
    { beat: 2.5, note: NOTE.closedHat, velocity: 55 },

    // beat 4 — backbeat
    { beat: 3, note: NOTE.snare, velocity: 120 },
    { beat: 3, note: NOTE.closedHat, velocity: 75 },
    { beat: 3.5, note: NOTE.snareRim, velocity: 30 }, // ghost
    { beat: 3.5, note: NOTE.closedHat, velocity: 55 },

    // beat 5 — the "extra" beat that defines 5/4
    { beat: 4, note: NOTE.kick, velocity: 110 },
    { beat: 4, note: NOTE.closedHat, velocity: 75 },
    { beat: 4.5, note: NOTE.tomLow, velocity: 90 }, // pickup into next bar
    { beat: 4.5, note: NOTE.closedHat, velocity: 55 },
  ],
}

const chorus = {
  name: 'chorus',
  beats: 5,
  hits: [
    // beat 1 — explode
    { beat: 0, note: NOTE.kick, velocity: 125 },
    { beat: 0, note: NOTE.crashRight, velocity: 115 },
    { beat: 0.5, note: NOTE.china, velocity: 80 },

    // beat 2
    { beat: 1, note: NOTE.snare, velocity: 122 },
    { beat: 1, note: NOTE.tomMid, velocity: 95 },
    { beat: 1.5, note: NOTE.tomLow, velocity: 90 },

    // beat 3
    { beat: 2, note: NOTE.kick, velocity: 115 },
    { beat: 2, note: NOTE.floorTom, velocity: 105 },
    { beat: 2.5, note: NOTE.floorTomLow, velocity: 100 },

    // beat 4 — second crash
    { beat: 3, note: NOTE.snare, velocity: 124 },
    { beat: 3, note: NOTE.crashLeft, velocity: 110 },
    { beat: 3.5, note: NOTE.tomHigh, velocity: 95 },

    // beat 5 — descending fill into the next bar
    { beat: 4, note: NOTE.tomMid, velocity: 105 },
    { beat: 4.25, note: NOTE.tomLow, velocity: 105 },
    { beat: 4.5, note: NOTE.floorTom, velocity: 110 },
    { beat: 4.75, note: NOTE.floorTomLow, velocity: 115 },
  ],
}

const bridge = {
  name: 'bridge',
  beats: 5,
  hits: [
    // ride bell 8ths across all 5 beats
    { beat: 0, note: NOTE.rideBell, velocity: 95 },
    { beat: 0.5, note: NOTE.rideBell, velocity: 70 },
    { beat: 1, note: NOTE.rideBell, velocity: 90 },
    { beat: 1.5, note: NOTE.rideBell, velocity: 70 },
    { beat: 2, note: NOTE.rideBell, velocity: 85 },
    { beat: 2.5, note: NOTE.rideBell, velocity: 70 },
    { beat: 3, note: NOTE.rideBell, velocity: 90 },
    { beat: 3.5, note: NOTE.rideBell, velocity: 70 },
    { beat: 4, note: NOTE.rideBell, velocity: 95 },
    { beat: 4.5, note: NOTE.rideBell, velocity: 75 },

    // kick + snare grid underneath
    { beat: 0, note: NOTE.kick, velocity: 110 },
    { beat: 1, note: NOTE.snare, velocity: 105 },
    { beat: 2.5, note: NOTE.kick, velocity: 100 },
    { beat: 3, note: NOTE.snare, velocity: 110 },

    // beat 5 — sub boom for weight, lands on the displaced "1"
    { beat: 4, note: NOTE.kick, velocity: 115 },
    { beat: 4, note: NOTE.fxBoom, velocity: 100 },
  ],
}

const outro = {
  name: 'outro',
  beats: 5,
  hits: [
    { beat: 0, note: NOTE.kick, velocity: 125 },
    { beat: 0, note: NOTE.crashLeft, velocity: 120 },
    { beat: 0, note: NOTE.crashRight, velocity: 120 },
    { beat: 0, note: NOTE.china, velocity: 100 },
    { beat: 0, note: NOTE.floorTomLow, velocity: 115 },
    { beat: 0, note: NOTE.fxBoom, velocity: 110 },
  ],
}

const song: Song = {
  name: 'Example (5/4 Tool-like)',
  bpm: 88,
  patterns: [intro, verse, chorus, bridge, outro],
  arrangement: [
    { pattern: 'intro' },
    { pattern: 'verse', repeat: 4 },
    { pattern: 'chorus', repeat: 2 },
    { pattern: 'verse', repeat: 4 },
    { pattern: 'bridge', repeat: 4 },
    { pattern: 'chorus', repeat: 4 },
    { pattern: 'outro' },
  ],
}

export default song
