# beat — roadmap

What to build next, grouped by impact.

Each item is **independently shippable**. No ordering enforced — pick
what you want, when you want.

## Top 3 to do first

These give the biggest payoff per hour of work.

1. **MIDI file export** — turn `expandSong()` output into a `.mid` file.
   Drag into Logic for permanent capture. Share with collaborators.
   Audition a song without running TS.
2. **Tab parser primitive** — extract the Grudge file's `parseBar()`
   into `code/tab.ts`. Every future song becomes 5× faster to encode.
3. **Live transport keys** — space to pause, `[` / `]` to jump bars, `L`
   to loop the current section. Pure workflow joy.

## Authoring

How songs get written.

- **Tab parser** as a shared primitive in `code/tab.ts`. Used by Grudge
  already; promote it.
- **Pattern transformations**: `reverse(p)`, `doubleTime(p)`,
  `halfTime(p)`, `rotate(p, beats)`, `transpose(p, semitones)`. One
  pattern → five.
- **Per-section humanize override** —
  `{ pattern: 'verse', repeat: 4, humanize: {...} }`. Bridge drags,
  verse stays tight.
- **Velocity curves over arrangements** — crescendo across N bars, not
  just one pattern.
- **Tempo automation** —
  `tempoMap: [{ atBeat: 0, bpm: 98 }, { atBeat: 80, bpm: 105 }]`.
  Ritards, accels.
- **Repeat with variation** —
  `{ pattern: 'verse', repeat: 4, vary: (i, hits) => ... }` for fills on
  the 4th repeat only.
- **Probability per hit** —
  `{ beat: 0.5, note: NOTE.snareGhost, probability: 0.6 }`. Each pass
  picks a different subset.
- **Polyrhythm helpers** — `polyrhythm(3, 4, NOTE.tomMid)` returns a
  Pattern.
- **Swing as a global feel parameter** — `feel: { swing: 0.66 }` on
  Song.
- **Pattern library** — `code/library/fills.ts`,
  `code/library/grooves.ts` with named, reusable phrases.
- **Song templates** — `rock4onFloor()`, `jazzShuffle()` factories that
  scaffold a Song.
- **Genre presets** — humanize + voicing defaults per style (rock, jazz,
  latin, drum-and-bass).
- **Quantize helper** — snap messy hand-entered hits to the nearest 16th
  / triplet.
- **Time-signature change support** — explicit `timeSignature: '5/8'` on
  Pattern. Currently inferred from `beats`.
- **Polymeter** — different patterns at different lengths cycling
  against each other.
- **Pickup / count-in** — `countIn: 4` on Song for a click before bar 1.
- **Click track layered with song** — `--click` flag adds a metronome on
  a separate channel.

## MIDI

What can leave the engine.

- **MIDI file export** — `code/export/midi.ts`. Use a tiny lib like
  `midi-writer-js`. Output: drag-into-Logic-ready `.mid`.
- **CC support** — `Hit.pitchBend`, `Hit.hiHatOpenness`, generic
  `Hit.cc: { 4: 80 }`. Designed in `note/superior-drummer-control.md`,
  not coded.
- **Pitch bend streams** — `code/bend.ts` for per-beat bend automation
  (sliding tom pitch through a fill).
- **MIDI clock out** — Logic chases TS BPM. No dual-tempo confusion.
- **MTC (MIDI Time Code)** — chase from a recorder.
- **Multi-channel routing** — one Song, multiple SD3 tracks (kit A on ch
  1, kit B on ch 2). Per `superior-drummer-control.md` Workaround A.
- **Choke groups** — declare
  `{ cymbals: ['crashLeft', 'crashRight', 'china', 'splash'] }`. New hit
  on any group member chokes the others.
- **Per-channel output port** — route different drums to different IAC
  ports (different DAWs).
- **Per-channel mute / solo** at the song level.

## Live transport

What you can do while it's playing.

- **Keypress controls** — space (pause), `[` / `]` (jump back/forward 1
  bar), `L` (loop section), `M` (mute track), `S` (solo).
- **Bar-position log** — `[bar 7/16 · verse-2]` updates continuously.
- **Live mute / solo voices** — number keys 1-9 toggle drums (kick=1,
  snare=2, ...).
- **Loop region** — `--loop 7-12` plays only bars 7-12 forever.
- **Tap tempo** — `t` key during playback overrides BPM live.
- **Step mode** — `--step` advances one bar per Enter press.
- **Skip to section** — `--from chorus`, `--from bar:24`.

## Capture

What can come into the engine.

- **MIDI input → Pattern** — listen on IAC, capture what you tap on a
  pad, auto-quantize, dump as a `Pattern` literal you paste into a song
  file.
- **Tap-record by playing** — `pnpm cli capture --bars 4` records the
  next 4 bars from your controller.
- **Quantize captured MIDI** — `--quantize 1/16` or `--quantize 1/16t`
  (triplet).
- **Audio recording** — document Logic-side recording (this engine can't
  write audio, but the workflow note belongs here).

## Visualization

How to see what's happening.

- **ASCII piano roll** — `pnpm cli render <song>` prints the song as a
  tab-style grid in the terminal.
- **Tab generator** — round-trip `Hit[]` back to tab strings (so songs
  typed by hand can be normalized; captured MIDI can be exported as
  tab).
- **Bar-by-bar progress bar** — terminal animation while playing.
- **Web visualizer** — long-term: a tiny `localhost:5173` page showing
  the song scrolling past in real time.
- **VS Code extension** — highlight bars in the song file as they play.
  Click a bar to jump to it.

## Sanity / testing

So it doesn't break.

- **`expandSong` validation** — warn on hits with
  `beat >= pattern.beats`, unknown pattern references, velocities out of
  `[1, 127]`.
- **Vitest unit tests** — tab parser roundtrip, `expandSong`
  correctness, humanize determinism by seed.
- **Integration test without MIDI hardware** — mock `easymidi.Output`,
  assert hit sequence.
- **Linting for songs** — `pnpm cli check <song>` runs validation +
  dry-run play, reports issues.
- **Audio diff** — record a song to `.mid`, compare against a checked-in
  baseline.

## Sample audition

Tools for inspecting your kit.

- **`pnpm cli sweep`** — play every NOTE entry alongside its name with
  longer pauses (already partly done by `test-all`).
- **Velocity sweep** — fire one NOTE at velocities 10, 30, 60, 90, 120
  to hear layer transitions.
- **Articulation sweep** — fire all snare articulations (main, rim,
  sidestick, ghost) in sequence.
- **Choke test** — fire each cymbal then choke it on a 1-second delay.

## Multi-song

Beyond one song at a time.

- **Setlists** — `code/setlist.ts`: ordered list of songs with
  crossfades + key changes.
- **Crossfade between songs** — fade out the last bar of song A as song
  B's intro starts.
- **Album mode** — play all songs in a directory back-to-back with
  configurable gaps.
- **Live setlist navigator** — keyboard advance to next song, mark a
  song to repeat.

## Advanced / experimental

Won't ship soon, worth keeping in mind.

- **Chord-aware tom melodies** — pass a chord progression, toms
  auto-pitch-bend to fit.
- **Generative fills** — given the surrounding pattern + a length,
  generate a stylistic fill.
- **External controller support** — foot pedal triggers a fill, MIDI
  knob controls humanize amount live.
- **Co-play with Logic** — listen to Logic's MIDI output, sync TS
  phrases against it.
- **Distributed playback** — multiple machines on the LAN run different
  drums (kick on box A, cymbals on box B).
- **Python interop** — pipe TS-generated MIDI into a Python ML model for
  variation.

## Out of scope

Worth saying out loud so we don't drift.

- **Audio synthesis in TS** — SD3 / Logic does the audio. TS is a
  scheduler.
- **Notation engine** — for serious notation use Sibelius / Dorico /
  MuseScore. We export to MIDI; they import it.
- **Plugin GUI control** — SD3 has no API for kit-piece swaps, tuning,
  mixer. Set up in GUI, save preset, recall manually. Documented in
  `note/superior-drummer-control.md`.
- **Real-time audio streaming** — wrong stack; use TouchDesigner / WebGL
  / Pure Data.

## Done

What already ships.

- IAC port discovery + auto-connect (`code/output.ts`)
- Canonical SD3 Core Library note map (`code/note.ts`)
- Hit / Pattern / Section / Song types + arrangement expander
  (`code/song.ts`)
- Static song player (`code/console/play.ts`)
- Hot-reload watcher with debounced fs.watch + ESM cache-bust
- `--once` and `--restart` watch modes
- `--pattern <name>` solo mode (loop a single pattern forever)
- yargs-based CLI under `code/console/` with subcommands: `play`,
  `boot`, `loop`, `list-ports`, `test-all`
- Test-all command — every NOTE entry hit twice, timestamped log per hit
- Humanize: timing + velocity jitter + bias, per-note overrides, presets
  (off/tight/subtle/loose/sloppy), seedable for reproducibility
- Tab parser (currently in `base/song/tool/grudge/index.ts` — needs
  promotion to `code/tab.ts`)
- Songs: `example` (5/4 Tool-like), `kitchen-sink` (every subdivision +
  polyrhythm), `tool/grudge` (16-bar intro decoded from real tab)
- Docs: SD3 control limits + workarounds, Tool drum sound setup, MIDI
  hello world
