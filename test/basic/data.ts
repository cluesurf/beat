// Basic 4/4 — JSON form. Raw MIDI note numbers, no constants,
// no DSL. The pure-data version that could be hand-edited or
// emitted by another tool. Same song as `text.ts` and `code.ts`.

import type { Song } from '@/code/song'

const song: Song = {
  name: 'Basic 4/4 (data)',
  bpm: 100,
  patterns: [
    {
      name: 'main',
      beats: 4,
      hits: [
        { beat: 0,   note: 36, velocity: 100 },
        { beat: 0,   note: 42, velocity: 78 },
        { beat: 0.5, note: 42, velocity: 78 },
        { beat: 1,   note: 38, velocity: 95 },
        { beat: 1,   note: 42, velocity: 78 },
        { beat: 1.5, note: 42, velocity: 78 },
        { beat: 2,   note: 36, velocity: 100 },
        { beat: 2,   note: 42, velocity: 78 },
        { beat: 2.5, note: 42, velocity: 78 },
        { beat: 3,   note: 38, velocity: 95 },
        { beat: 3,   note: 42, velocity: 78 },
        { beat: 3.5, note: 42, velocity: 78 },
      ],
    },
  ],
  arrangement: [{ pattern: 'main' }],
}

export default song
