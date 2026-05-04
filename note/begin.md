# TypeScript → MIDI → Logic Pro

Goal:

```
TypeScript → virtual MIDI port → Logic Pro → Superior Drummer 3 → sound
```

This doc is the minimum-viable plumbing. For format / engine details see
[`tab/spec.md`](./tab/spec.md), [`tab/drum.md`](./tab/drum.md), and
[`syntax.md`](./syntax.md).

## 1. Enable the macOS virtual MIDI port

```
Audio MIDI Setup
→ Window
→ Show MIDI Studio
→ IAC Driver
→ Check "Device is online"
→ Add port: TS Drum Engine
```

## 2. Install + verify

```bash
pnpm install        # installs easymidi via the catalog
pnpm list:ports     # confirm "TS Drum Engine" appears under outputs
```

If the port doesn't appear: re-check step 1, then restart Audio MIDI
Setup. macOS sometimes needs a kick.

## 3. Set up Logic Pro

```
Create Software Instrument Track
Insert Superior Drummer 3
Record-enable the track
Load any kit (default GM mapping is fine: 36=kick, 38=snare)
```

Logic listens to all MIDI inputs by default. No per-port config needed.

## 4. Hear sound

```bash
pnpm try            # quick sanity hit
pnpm play           # default song
pnpm play tool/grudge
```

## 5. If you hear nothing

Check, in order:

1. IAC Driver "Device is online" is checked.
2. The IAC port is named exactly **TS Drum Engine** (or contains those
   words — the lookup uses `includes()`).
3. `pnpm list:ports` shows it under outputs.
4. Logic track is selected AND record-enabled.
5. Superior Drummer has a kit loaded with audible samples.
6. Logic's audio output is working — test with the on-screen keyboard or
   a built-in instrument.
7. MIDI channel 10 (drum channel) isn't filtered in Logic.
8. Try note 36 directly in Logic's piano roll — does it trigger SD3? If
   not, the problem is downstream of MIDI.

## 6. What just happened

```
code/console/play.ts (or `pnpm try`)
   → reads test/<song>/text.beat
   → uses easymidi to find a port matching "TS Drum Engine"
   → sends note-on / note-off pairs on channel 10
                ↓
macOS IAC virtual MIDI bus
                ↓
Logic Pro (any track record-enabled)
                ↓
Superior Drummer 3 receives the note numbers
                ↓
audio output
```

Once this works end-to-end, you're done with plumbing. Everything else
is on the engine side: see [`tab/spec.md`](./tab/spec.md) and the song
folders under [`../test/`](../test).

## 7. Common gotchas

| Symptom                                | Likely cause                                                               |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `MIDI port not found` error            | IAC port not enabled / wrong name                                          |
| `easymidi` install fails               | Native build needs Xcode CLT — `xcode-select --install`                    |
| Hear MIDI but no audio                 | Logic track not record-enabled, or SD3 has no kit                          |
| Hits register but trigger wrong sample | Kit's note mapping ≠ GM (open SD3 mapping editor)                          |
| Latency >50ms                          | Logic's audio buffer too high — Preferences → Audio → I/O Buffer 64 or 128 |

## 8. File layout

```
beat/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── code/
│   ├── note.ts        # NOTE.kick = 36, etc.
│   ├── output.ts      # opens IAC port "TS Drum Engine"
│   ├── hit.ts         # send one note-on/off pair
│   ├── song.ts        # Song / Pattern / Hit types + expander
│   ├── humanize.ts    # timing + velocity jitter
│   ├── arrangement.ts # bar-by-bar walker
│   ├── tab/           # .beat parser + drumkit defaults
│   ├── export/        # .mid export
│   └── console/       # CLI subcommands (play, export, try, etc.)
├── test/
│   ├── basic/         # text.beat / code.ts / data.ts / index.ts
│   ├── kitchen-sink/
│   └── tool/grudge/
├── text/              # the .beat VS Code syntax-highlighter extension
└── note/
    ├── begin.md       # this file
    ├── tab/spec.md    # generic tab format
    ├── tab/drum.md    # drumkit defaults
    ├── syntax.md      # syntax-highlighter dev/build/publish
    └── roadmap.md
```
