// Basic 4/4 — DSL form. Imperative TS code, uses the named NOTE
// constants. Same song as `text.ts` and `data.ts`.

import type { Song } from '@/code/song'
import { NOTE } from '@/code/note'

const HAT_VELOCITY = 78
const SNARE_VELOCITY = 95
const KICK_VELOCITY = 100

const song: Song = {
  name: 'Basic 4/4 (code)',
  bpm: 100,
  patterns: [
    {
      name: 'main',
      beats: 4,
      hits: [
        // Kick on beats 1 and 3
        { beat: 0, note: NOTE.kick, velocity: KICK_VELOCITY },
        { beat: 2, note: NOTE.kick, velocity: KICK_VELOCITY },
        // Snare on beats 2 and 4
        { beat: 1, note: NOTE.snare, velocity: SNARE_VELOCITY },
        { beat: 3, note: NOTE.snare, velocity: SNARE_VELOCITY },
        // Hi-hat 8ths
        { beat: 0,   note: NOTE.closedHat, velocity: HAT_VELOCITY },
        { beat: 0.5, note: NOTE.closedHat, velocity: HAT_VELOCITY },
        { beat: 1,   note: NOTE.closedHat, velocity: HAT_VELOCITY },
        { beat: 1.5, note: NOTE.closedHat, velocity: HAT_VELOCITY },
        { beat: 2,   note: NOTE.closedHat, velocity: HAT_VELOCITY },
        { beat: 2.5, note: NOTE.closedHat, velocity: HAT_VELOCITY },
        { beat: 3,   note: NOTE.closedHat, velocity: HAT_VELOCITY },
        { beat: 3.5, note: NOTE.closedHat, velocity: HAT_VELOCITY },
      ],
    },
  ],
  arrangement: [{ pattern: 'main' }],
}

export default song
