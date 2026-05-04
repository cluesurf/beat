# beat. Roadmap

What to build next, grouped by impact.

Each item is **independently shippable**. No ordering enforced. Pick
what you want, when you want.

## Top 3 to do first

These give the biggest payoff per hour of work.

1. **MIDI file export**. Turn `expandSong()` output into a `.mid` file.
   Drag into Logic for permanent capture. Share with collaborators.
   Audition a song without running TS.
2. **Tab parser primitive**. Extract the Grudge file's `parseBar()`
   into `code/tab.ts`. Every future song becomes 5× faster to encode.
3. **Live transport keys**. Space to pause, `[` / `]` to jump bars, `L`
   to loop the current section. Pure workflow joy.

## Authoring

How songs get written.

- **Tab parser** as a shared primitive in `code/tab.ts`. Used by Grudge
  already; promote it.
- **Pattern transformations**: `reverse(p)`, `doubleTime(p)`,
  `halfTime(p)`, `rotate(p, beats)`, `transpose(p, semitones)`. One
  pattern → five.
- **Per-section humanize override**.
  `{ pattern: 'verse', repeat: 4, humanize: {...} }`. Bridge drags,
  verse stays tight.
- **Velocity curves over arrangements**. Crescendo across N bars, not
  just one pattern.
- **Tempo automation**.
  `tempoMap: [{ atBeat: 0, bpm: 98 }, { atBeat: 80, bpm: 105 }]`.
  Ritards, accels.
- **Repeat with variation**.
  `{ pattern: 'verse', repeat: 4, vary: (i, hits) => ... }` for fills on
  the 4th repeat only.
- **Probability per hit**.
  `{ beat: 0.5, note: NOTE.snareGhost, probability: 0.6 }`. Each pass
  picks a different subset.
- **Polyrhythm helpers**. `polyrhythm(3, 4, NOTE.tomMid)` returns a
  Pattern.
- **Swing as a global feel parameter**. `feel: { swing: 0.66 }` on
  Song.
- **Pattern library**. `code/library/fills.ts`,
  `code/library/grooves.ts` with named, reusable phrases.
- **Song templates**. `rock4onFloor()`, `jazzShuffle()` factories that
  scaffold a Song.
- **Genre presets**. Humanize + voicing defaults per style (rock, jazz,
  latin, drum-and-bass).
- **Quantize helper**. Snap messy hand-entered hits to the nearest 16th
  / triplet.
- **Time-signature change support**. Explicit `timeSignature: '5/8'` on
  Pattern. Currently inferred from `beats`.
- **Polymeter**. Different patterns at different lengths cycling
  against each other.
- **Pickup / count-in**. `countIn: 4` on Song for a click before bar 1.
- **Click track layered with song**. `--click` flag adds a metronome on
  a separate channel.

## MIDI

What can leave the engine.

- **MIDI file export**. `code/export/midi.ts`. Use a tiny lib like
  `midi-writer-js`. Output: drag-into-Logic-ready `.mid`.
- **CC support**. `Hit.pitchBend`, `Hit.hiHatOpenness`, generic
  `Hit.cc: { 4: 80 }`. Designed in `note/superior-drummer-control.md`,
  not coded.
- **Pitch bend streams**. `code/bend.ts` for per-beat bend automation
  (sliding tom pitch through a fill).
- **MIDI clock out**. Logic chases TS BPM. No dual-tempo confusion.
- **MTC (MIDI Time Code)**. Chase from a recorder.
- **Multi-channel routing**. One Song, multiple SD3 tracks (kit A on ch
  1, kit B on ch 2). Per `superior-drummer-control.md` Workaround A.
- **Choke groups**. Declare
  `{ cymbals: ['crashLeft', 'crashRight', 'china', 'splash'] }`. New hit
  on any group member chokes the others.
- **Per-channel output port**. Route different drums to different IAC
  ports (different DAWs).
- **Per-channel mute / solo** at the song level.

## Live transport

What you can do while it's playing.

- **Keypress controls**. Space (pause), `[` / `]` (jump back/forward 1
  bar), `L` (loop section), `M` (mute track), `S` (solo).
- **Bar-position log**. `[bar 7/16 · verse-2]` updates continuously.
- **Live mute / solo voices**. Number keys 1-9 toggle drums (kick=1,
  snare=2, ...).
- **Loop region**. `--loop 7-12` plays only bars 7-12 forever.
- **Tap tempo**. `t` key during playback overrides BPM live.
- **Step mode**. `--step` advances one bar per Enter press.
- **Skip to section**. `--from chorus`, `--from bar:24`.

## Capture

What can come into the engine.

- **MIDI input → Pattern**. Listen on IAC, capture what you tap on a
  pad, auto-quantize, dump as a `Pattern` literal you paste into a song
  file.
- **Tap-record by playing**. `pnpm cli capture --bars 4` records the
  next 4 bars from your controller.
- **Quantize captured MIDI**. `--quantize 1/16` or `--quantize 1/16t`
  (triplet).
- **Audio recording**. Document Logic-side recording (this engine can't
  write audio, but the workflow note belongs here).

## Visualization

How to see what's happening.

- **ASCII piano roll**. `pnpm cli render <song>` prints the song as a
  tab-style grid in the terminal.
- **Tab generator**. Round-trip `Hit[]` back to tab strings (so songs
  typed by hand can be normalized; captured MIDI can be exported as
  tab).
- **Bar-by-bar progress bar**. Terminal animation while playing.
- **Web visualizer**. Long-term: a tiny `localhost:5173` page showing
  the song scrolling past in real time.
- **VS Code extension**. Highlight bars in the song file as they play.
  Click a bar to jump to it.

## Sanity / testing

So it doesn't break.

- **`expandSong` validation**. Warn on hits with
  `beat >= pattern.beats`, unknown pattern references, velocities out of
  `[1, 127]`.
- **Vitest unit tests**. Tab parser roundtrip, `expandSong`
  correctness, humanize determinism by seed.
- **Integration test without MIDI hardware**. Mock `easymidi.Output`,
  assert hit sequence.
- **Linting for songs**. `pnpm cli check <song>` runs validation +
  dry-run play, reports issues.
- **Audio diff**. Record a song to `.mid`, compare against a checked-in
  baseline.

## Sample audition

Tools for inspecting your kit.

- **`pnpm cli sweep`**. Play every NOTE entry alongside its name with
  longer pauses (already partly done by `test-all`).
- **Velocity sweep**. Fire one NOTE at velocities 10, 30, 60, 90, 120
  to hear layer transitions.
- **Articulation sweep**. Fire all snare articulations (main, rim,
  sidestick, ghost) in sequence.
- **Choke test**. Fire each cymbal then choke it on a 1-second delay.

## Beyond drums: any MIDI instrument

The format is already instrument-agnostic, the parser just defaults to
drumkit. Same `.beat` syntax should drive **any** MIDI-receiving
instrument, with per-instrument articulation packs.

Target families:

- **Pitched percussion**: handpan / hang, marimba, vibraphone, kalimba,
  steel pan, gamelan, taiko, frame drums, tabla, djembe, congas. Each
  one wants its own articulation set (slap / tone / bass / muted /
  flam / roll) plus a pitch axis (notes laid out across the staff).
- **Wind**: flute, recorder, ney, shakuhachi, duduk, didgeridoo. Needs
  pitch + articulation (legato / staccato / breath-attack / overblow)
  plus optional vibrato as a CC stream.
- **Cinematic orchestra**: strings (sustains, spiccato, pizz, trem,
  col legno), brass (sustain, staccato, marcato, swell, fall),
  woodwinds, choir (ah / oh / mm / consonant attacks), percussion
  ensembles. Each section's articulations live on different MIDI key-
  switches, which the line config maps to the tab's note characters.
- **Tribal / world**: Tibetan singing bowls, gongs, didgeridoo, frame
  drums, shakers, rainstick, bullroarer, vocal phonemes / chants,
  ethnic flutes (kena, bansuri, dizi).

What needs to be built:

- **`InstrumentPack`**. A reusable definition of articulations + line
  defaults, shipped under `code/tab/pack/<name>.ts`. `drumkit` is the
  first; add `handpan`, `flute`, `strings`, `taiko`, etc.
- **Pitched-instrument syntax**. For melodic lines the tab needs a
  pitch axis. Either (a) one row per chromatic note with `x` marks (like
  a piano-roll grid), or (b) a single row with note-letter graphemes
  (`G`, `A`, `B♭`, `C`) instead of `x`/`o`. Pick (b) for compactness:
  the same colon-separated grid, but each cell encodes a pitch.
- **Multi-instrument songs**. A single `.beat` file declares multiple
  `instrument:` blocks (drumkit + handpan + strings). Each tab block
  inherits the instrument from its `instrument:` field; default carries
  forward.
- **General-MIDI program changes**. CC-bank + program-change events
  per instrument so a single GM-compatible synth can render many parts
  on different channels.
- **VST keyswitch sequences**. For Spitfire / EastWest / NI libraries,
  emit the keyswitch note before the note range plays, encoding
  articulation per phrase.
- **Pitch-bend / mod-wheel streams**. For wind / strings vibrato,
  generate continuous CC1 / CC74 / pitch-bend automation alongside the
  hits, derived from a `vibrato:` or `expression:` field in the line
  config.
- **Tuning systems**. Handpan, gamelan, etc. use non-12TET scales.
  Add `tuning:` field on instrument packs that remaps note letters to
  cent-offset MIDI notes (or uses MTS-ESP-style tuning tables).
- **Multi-channel routing**. Each instrument pack declares its
  preferred MIDI channel; the engine sends each line to its own channel
  so a DAW can host one instance per part.

Single-line example (handpan, draft):

```beat
instrument: handpan
tempo: 78
tuning: D-minor

H|D-A-:F-D-:A-G-:F-A-|
```

Same parser, different pack. Articulations like `H` / `T` / `S` (head /
tom-shoulder / sympathetic) become handpan-zone names like `ding` /
`shoulder` / `gu`.

## Multi-song

Beyond one song at a time.

- **Setlists**. `code/setlist.ts`: ordered list of songs with
  crossfades + key changes.
- **Crossfade between songs**. Fade out the last bar of song A as song
  B's intro starts.
- **Album mode**. Play all songs in a directory back-to-back with
  configurable gaps.
- **Live setlist navigator**. Keyboard advance to next song, mark a
  song to repeat.

## Advanced / experimental

Won't ship soon, worth keeping in mind.

- **Chord-aware tom melodies**. Pass a chord progression, toms
  auto-pitch-bend to fit.
- **Generative fills**. Given the surrounding pattern + a length,
  generate a stylistic fill.
- **External controller support**. Foot pedal triggers a fill, MIDI
  knob controls humanize amount live.
- **Co-play with Logic**. Listen to Logic's MIDI output, sync TS
  phrases against it.
- **Distributed playback**. Multiple machines on the LAN run different
  drums (kick on box A, cymbals on box B).
- **Python interop**. Pipe TS-generated MIDI into a Python ML model for
  variation.

## Out of scope

Worth saying out loud so we don't drift.

- **Audio synthesis in TS**. SD3 / Logic does the audio. TS is a
  scheduler.
- **Notation engine**. For serious notation use Sibelius / Dorico /
  MuseScore. We export to MIDI; they import it.
- **Plugin GUI control**. SD3 has no API for kit-piece swaps, tuning,
  mixer. Set up in GUI, save preset, recall manually. Documented in
  `note/superior-drummer-control.md`.
- **Real-time audio streaming**. Wrong stack; use TouchDesigner / WebGL
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
- Test-all command. Every NOTE entry hit twice, timestamped log per hit
- Humanize: timing + velocity jitter + bias, per-note overrides, presets
  (off/tight/subtle/loose/sloppy), seedable for reproducibility
- Tab parser (currently in `base/song/tool/grudge/index.ts`. Needs
  promotion to `code/tab.ts`)
- Songs: `example` (5/4 Tool-like), `kitchen-sink` (every subdivision +
  polyrhythm), `tool/grudge` (16-bar intro decoded from real tab)
- Docs: SD3 control limits + workarounds, Tool drum sound setup, MIDI
  hello world
