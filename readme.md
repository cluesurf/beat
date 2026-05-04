# beat

TypeScript MIDI engine. Drives Logic Pro → Superior Drummer 3 via the
macOS IAC virtual MIDI bus.

```
beat/
├── package.json          # workspace root, deps via catalog:
├── pnpm-workspace.yaml   # pnpm catalog (single-package workspace)
├── tsconfig.json         # `@/*` → repo root
├── code/                 # engine
└── base/
    └── song/
        └── <song-name>/
            └── index.ts  # exports default Song
```

## Song architecture

A **song lives at `beat/base/song/<song-name>/index.ts`** and
default-exports a `Song`. The player loads it dynamically.

```ts
// beat/base/song/<song-name>/index.ts
import type { Song } from '@/code/song'
import { NOTE } from '@/code/note'

const song: Song = {
  name: 'My Song',
  bpm: 120,
  patterns: [
    {
      name: 'verse',
      beats: 4,
      hits: [
        { beat: 0, note: NOTE.kick, velocity: 110 },
        { beat: 1, note: NOTE.snare, velocity: 115 },
        { beat: 2, note: NOTE.kick, velocity: 105 },
        { beat: 3, note: NOTE.snare, velocity: 118 },
      ],
    },
  ],
  arrangement: [{ pattern: 'verse', repeat: 8 }],
}

export default song
```

### Song shape

| Field         | Type      | Why                                                   |
| ------------- | --------- | ----------------------------------------------------- |
| `name`        | string    | Display + log identifier                              |
| `bpm`         | number    | Tempo. Lets you change speed without rewriting beats  |
| `channel`     | number?   | Default MIDI channel for any hit that doesn't set one |
| `patterns`    | Pattern[] | Reusable phrase library                               |
| `arrangement` | Section[] | Order to play patterns in                             |

### Pattern shape

| Field   | Why                                                           |
| ------- | ------------------------------------------------------------- |
| `name`  | Lookup key referenced from `arrangement`                      |
| `beats` | Loop length. A 4/4 one-bar pattern is `4`                     |
| `hits`  | List of hits with beat-position relative to the pattern start |

### Hit shape

| Field        | Default        | Notes                                                                |
| ------------ | -------------- | -------------------------------------------------------------------- |
| `beat`       | required       | Position within the pattern. Sub-beats fine: `0.5` = "and" of beat 1 |
| `note`       | required       | Use `NOTE.kick` etc. from `@/code/note`                              |
| `velocity`   | 110            | 1-127                                                                |
| `durationMs` | 120            | Drums don't really care; SD3 plays the sample to its tail            |
| `channel`    | 9 (MIDI ch 10) | Override per hit to route to another sampler track                   |

### Why patterns + arrangement (not a flat hit list)

Songs are repetitive. Verse plays 4×, chorus 2×, verse again 4×. Storing
the literal hits 10× over would make edits brittle — change the verse
and you'd touch 4 places. The `patterns + arrangement` split lets you
edit a verse once and have the song rebuild itself.

If you ever want the flat hit list (e.g. to export to MIDI file), call
`expandSong(song)` from `code/song.ts` — it flattens into absolute beat
positions.

## Running

Prerequisite: macOS IAC bus configured + Logic Pro listening. Full setup
at `note/music/making/midi-hello-world.md`.

```bash
pnpm list:ports         # verify TS Drum Engine appears
pnpm boot               # 4 hardcoded hits
pnpm boot:loop          # endless kick/snare every 500ms
pnpm play               # play default song (example)
pnpm play <name>        # play beat/base/song/<name>/index.ts
```

## Roadmap (matches the architecture doc)

Done so far:

- IAC port discovery
- Canonical note map
- Hit / Pattern / Song types
- Arrangement expansion
- Static song player

Next:

- `code/humanize.ts` — controlled timing + velocity jitter
- `code/layers.ts` — one source hit → many outputs
- `code/polyrhythm.ts` — generate N-against-M phrases
- `code/midi-input.ts` — listen to SPD-SX, remap, re-emit
- `code/export.ts` — save the played MIDI as a .mid file
