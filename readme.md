<br/>
<br/>
<br/>
<br/>
<br/>
<br/>
<br/>

<h3 align='center'>@cluesurf/beat</h3>
<p align='center'>
  A Codebase Producer ∩
</p>

<br/>
<br/>
<br/>

## Introduction

TypeScript MIDI engine for drum tabs. Drives Logic Pro → Superior
Drummer 3 via the MacOS IAC virtual MIDI bus.

Piece of cake 🤩🚀🎧.

<img src="./text/view/part.png" width="512">

Pro music tools sound real because real drummers don't play to grid:
every hit moves a few milliseconds, every velocity drifts. **This repo
is a plain-text drum-tab format that compiles to humanized MIDI** and
streams it into Logic (or any DAW) over a virtual MIDI bus. You write
some [simple tabs](./note/tab/drum.md), save to a `something.beat` text
file, and Superior Drummer plays it back through your kit: with timing
jitter, velocity ranges, swing, flams and accents already baked in.

## Quickstart

First, follow [`note/begin.md`](./note/begin.md) once to enable the
MacOS IAC virtual MIDI port and load Superior Drummer 3 in Logic.

Then:

```bash
npm install -g @cluesurf/beat
```

Save this as `calm.beat`:

```beat
instrument: drumkit
tempo: 88
humanize: subtle

measure: 4*4
C|X---:----:----:----|
H|x-x-:x-x-:x-x-:x-x-|
S|----:x---:----:x---|
K|x---:--x-:--x-:----|
```

Run it:

```bash
beat ./calm.beat
```

It loops forever, reloads on save, and plays through Logic. Hit Ctrl-C
to stop.

## Beyond drums

Drumkit is the first instrument pack. The format is instrument-agnostic:
the same `.beat` file format can drive **any MIDI instrument** via
pluggable packs. On the roadmap: handpan, flute, cinematic orchestra
(strings / brass / woodwinds / choir), and tribal / world instruments
(taiko, frame drums, kalimba, gongs, ethnic flutes). See
[`note/roadmap.md`](./note/roadmap.md#beyond-drums-any-midi-instrument)
for the design.

## Programmatic API

Same engine, called from your own TypeScript. Two equivalent ways to
hand the engine a Song.

### Text API

Parse a `.beat` text. The file format is the same one the CLI reads.

```ts
import { readFileSync } from 'node:fs'
import { parse, play } from '@cluesurf/beat'

const beat = parse(readFileSync('./calm.beat', 'utf8'))
const stop = play(beat.song, { loop: true })

await stop() // whenever you want
```

`parse(text)` returns `{ song, hits, config, errors }`.

### JSON API

Skip the parser. Build the Song directly as data and pass it to `play`.

```ts
import { play, NOTE, type Song } from '@cluesurf/beat'

const song: Song = {
  name: 'Calm',
  bpm: 88,
  patterns: [
    {
      name: 'main',
      beats: 4,
      hits: [
        { beat: 0, note: NOTE.crashLeft, velocity: 100 },
        { beat: 0, note: NOTE.kick, velocity: 100 },
        { beat: 1, note: NOTE.snare, velocity: 95 },
        { beat: 1.5, note: NOTE.kick, velocity: 100 },
        { beat: 2.5, note: NOTE.kick, velocity: 100 },
        { beat: 3, note: NOTE.snare, velocity: 95 },
        // 8th-note hi-hat
        ...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(beat => ({
          beat,
          note: NOTE.closedHat,
          velocity: 78,
        })),
      ],
    },
  ],
  arrangement: [{ pattern: 'main', repeat: 8 }],
  humanize: { timing: 0.015, velocity: 6, timingBias: -0.1 },
}

const stop = play(song, { loop: true })
await stop()
```

Same `Song` shape on both sides. The text parser is just a sugar layer
over building this object directly. See
[`code/index.ts`](./code/index.ts) for the full surface (`humanize`,
`expandSong`, `exportSongToMidi`, `NOTE`, etc).

## What's in here

```
beat/
├── code/             # the engine (parser, scheduler, MIDI export, humanize)
├── test/             # songs (each in text.beat / code.ts / data.ts forms)
├── text/             # the .beat VS Code syntax-highlighter extension
├── note/             # docs (spec, drum defaults, roadmap, syntax, etc.)
```

## Examples

Test songs live at `test/<name>/` and may exist in three equivalent
representations:

| File        | What it is                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| `text.beat` | Text drum tab: see [`note/tab/spec.md`](./note/tab/spec.md) and [`note/tab/drum.md`](./note/tab/drum.md) |
| `code.ts`   | Imperative TypeScript DSL (NOTE constants)                                                               |
| `data.ts`   | Pure data (raw MIDI note numbers)                                                                        |

`pnpm play <name>` picks the first format it finds (`text.beat` first by
default). Override with `--format beat | code | data | text`.

```beat
# test/basic/text.beat
instrument: drumkit
tempo: 100

measure: 4*4
H|x-x-:x-x-:x-x-:x-x-|
S|----:x---:----:x---|
K|x---:----:x---:----|
```

## Running

Prerequisite: MacOS IAC bus configured + Logic Pro listening. Full setup
at [`note/begin.md`](./note/begin.md).

```bash
pnpm check                                   # verify "TS Drum Engine" port
pnpm try                                     # quick sanity hit
pnpm play                                    # default song
pnpm play tool/grudge                        # play a specific song
pnpm play tool/grudge --part bridge-2        # specific part
pnpm play tool/grudge --pattern bar-007      # solo one bar
pnpm play tool/grudge --from 17 --to 32      # play a region
pnpm play tool/grudge --humanize loose       # drag + jitter
pnpm export tool/grudge                      # write a .mid file
```

## Syntax highlighter

The
[VS Code extension](https://marketplace.visualstudio.com/items?itemName=cluesurf.beat-text)
lives in [`text/`](./text). Top-level scripts:

```bash
pnpm text:make    # build the .vsix
pnpm text:load    # build + install into VS Code
pnpm text:login   # vsce login cluesurf (one-time)
pnpm text:host    # publish to the marketplace
```

See [`note/syntax.md`](./note/syntax.md) for the full layout, scope
table, and dev loop.

## Tests

```bash
pnpm test                        # 31 tests covering the tab parser
```

## Docs

- [`note/tab/spec.md`](./note/tab/spec.md): generic tab format spec
- [`note/tab/drum.md`](./note/tab/drum.md): drumkit defaults
- [`note/superior-drummer-control.md`](./note/superior-drummer-control.md)
  : what SD3 lets us program
- [`note/progressive-rock-drum-sound.md`](./note/progressive-rock-drum-sound.md):
  Progressive Rock style SD3 setup
- [`note/syntax.md`](./note/syntax.md): `.beat` syntax highlighter
- [`note/roadmap.md`](./note/roadmap.md): what's next

## License

MIT

## ClueSurf

Made by [ClueSurf](https://clue.surf), meditating on the universe ¤.
Follow the work on [YouTube](https://youtube.com/@cluesurf),
[X](https://x.com/cluesurf),
[Instagram](https://instagram.com/cluesurf),
[Substack](https://cluesurf.substack.com),
[Facebook](https://facebook.com/cluesurf), and
[LinkedIn](https://linkedin.com/company/cluesurf), and browse more of
our open-source work here on [GitHub](https://github.com/cluesurf).
