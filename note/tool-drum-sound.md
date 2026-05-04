# Tool drum sound. Superior Drummer 3 setup

How to configure SD3 once, in the GUI, so the kit you trigger from
`code/console/play.ts` actually sounds like Danny Carey.

Pieces required:

- **Superior Drummer 3** (host kit)
- **Progressive Foundry SDX** (sample library)
- **Two extra toms** (eight total)
- **Extra cymbals** (china + extra crashes + secondary ride)
- **Raw snare layer**
- **Per-tom tuning** (low → high mapped to specific pitches)

This is all GUI work in SD3. Save it as a preset when finished. The TS
engine in `code/` plays it; SD3 makes the noise.

---

## 1. Load Progressive Foundry as the base kit

```
SD3 → Library tab
  → SDX → "Progressive Foundry"
    → load preset "Progressive Foundry. Default"
```

This gives you Danny's pickled wood Sonor kit, his cymbals, his rooms.
It is the foundation. Everything else stacks on top.

Why Progressive Foundry: it was sampled at Ocean Way with Carey's actual
kit and Bob Clearmountain mics. Other Tool-adjacent sounds (Decades of
Decadence, Death & Darkness) miss the dry, woody attack.

---

## 2. Snare. Add the raw layer

Goal: Carey's snare reads as **woody crack** plus **tight sizzle**, not
just one or the other.

```
Drums tab → Snare slot
  → right-click → "Stack a drum"
    → from SDX: pick a "Raw" or "Dry" snare variant
      (Progressive Foundry includes several "no room mic" snares.
       use "Snare Top - Raw" or "Tama Bell Brass - Dry")
  → blend at 50/50
```

Tweak per taste in the Mixer:

- Lower the room mics on the raw layer (-12 dB or more)
- Bring up close mics on the raw layer
- Pan-match both layers dead center

Result: the room snare provides body, the raw snare provides attack.

Optional: add a third side-stick / cross-stick mapping on note 37 with a
softer shell hit for ghost work. The ghost notes in `base/song/example`
use `NOTE.snareRim`; map it to the raw snare's lightest layer in SD3's
Mapping window so ghosts read as wood not as wire.

---

## 3. Toms. Eight total, tuned

Default Progressive Foundry has 4 toms. Tool wants more. Two ways:

### Option A. Stack within existing slots

```
Drums tab → tomHigh slot
  → "Add second drum to this slot"
    → load a higher-pitched tom from another SDX library
      (e.g. Death & Darkness "Concert Tom 8″")
```

Stacking gets you two notes per tom slot but they fire on the same note
number. Useful for thickness, not for separate notes.

### Option B (preferred). Assign to unused note numbers

SD3's Mapping window lets you put any drum on any note. So you load
extra toms from the SDX browser and pin them to:

| Tom        | Note | TS constant          |
| ---------- | ---- | -------------------- |
| concert 8″ | 50   | add `NOTE.tomXHigh`  |
| rack 10″   | 48   | `NOTE.tomHigh`       |
| rack 12″   | 47   | `NOTE.tomMid`        |
| rack 14″   | 45   | `NOTE.tomLow`        |
| floor 16″  | 43   | `NOTE.floorTom`      |
| floor 18″  | 41   | `NOTE.floorTomLow`   |
| gong drum  | 39   | add `NOTE.gong`      |
| octoban hi | 56   | add `NOTE.octobanHi` |
| octoban lo | 58   | add `NOTE.octobanLo` |

Add the new constants to `code/note.ts` so TS hits can address them.

### Tuning the toms

Per-tom pitch knob lives in:

```
Drums tab → click tom slot → "Tuning" section
  → Pitch (semitones) + Fine (cents)
```

A musical tom set, low → high, tuned to a chord (Carey often plays toms
over an A drone or in fourths/fifths):

| Tom        | Pitch       | Why                               |
| ---------- | ----------- | --------------------------------- |
| octoban lo | A4 (+5 st)  | bright pickup notes               |
| octoban hi | E5 (+12 st) | top of the rack                   |
| concert 8″ | E4 (+0 st)  | tight high accents                |
| rack 10″   | D4 (-2 st)  | melodic lead tom                  |
| rack 12″   | A3 (-7 st)  | the "main" Lateralus tom voice    |
| rack 14″   | F3 (-10 st) | descending fill                   |
| floor 16″  | D3 (-12 st) | thunder                           |
| floor 18″  | A2 (-17 st) | the "Forty-Six and 2" cannon      |
| gong drum  | E2 (-24 st) | sub-bass drum at the end of fills |

Tune by ear against a piano. Carey's actual kit drifts; don't quantize
to perfect equal temperament. Leave 5–15 cents off so the toms breathe.

Save tuning as part of the preset: **File → Save Preset → "Tool
(custom)"**.

---

## 4. Cymbals. Add china + secondary crashes + secondary ride

Default Progressive Foundry: 2 crashes + ride + hat + splash. Tool needs
more.

```
Cymbals tab
  → "Add cymbal"
    → from SDX library, load:
        - Wuhan China 18″     (Carey's signature trash)
        - Sabian AAX Crash 19″ (right-side dark crash)
        - Paiste 2002 Crash 17″ (left-side bright)
        - Zildjian K Custom Ride 22″ (secondary ride for bell work)
        - Sabian HHX Splash 10″ (already in PF. Keep it)
        - Bell-only ride sample (for the bell ostinatos)
```

### Mapping

| Cymbal      | Note | TS constant              |
| ----------- | ---- | ------------------------ |
| crash L     | 49   | `NOTE.crashLeft`         |
| crash R     | 57   | `NOTE.crashRight`        |
| crash 19″   | 55   | add `NOTE.crashDark`     |
| china 18″   | 52   | `NOTE.china`             |
| ride tip    | 51   | `NOTE.rideTip`           |
| ride bell   | 53   | `NOTE.rideBell`          |
| second ride | 59   | add `NOTE.rideSecondary` |
| splash      | 54   | add `NOTE.splash`        |

### Choking

Make sure each cymbal has its choke articulation mapped. SD3 default:
**velocity 1 on the same note = choke**. The TS engine can fire those
directly. Useful for the bridge in `base/song/example`. Choke the crash
on beat 5 instead of letting it ring.

---

## 5. Mixer. Get out of the way

Dial in the room before adding any extra plugins.

```
Mixer tab
  → reduce overheads to taste
  → bus the toms into a single "Tom Bus" with
      - HPF at 80 Hz
      - mild compression (4:1, slow attack ~30ms, medium release)
  → bus the kick + snare + toms into "Drum Bus"
      - light bus compression (2:1, autorelease)
      - +1 dB at 60 Hz, +1 dB at 5 kHz
  → leave the cymbals alone except for HPF at 200 Hz
```

For Carey-style "dry but big": **drop the room mics by 6 dB** from the
PF default. He plays in a real room; you don't want the SDX sample- room
to compete.

---

## 6. Save it

```
File → Save Preset
  → name: "Tool (custom)"
  → location: SD3 user presets folder
```

From now on, recall it manually before running `pnpm play`. The TS
engine plays whatever kit is currently loaded. It doesn't care which.

---

## 7. Update `code/note.ts` for the new pieces

Add the extra constants the new mapping uses:

```ts
export const NOTE = {
  // ... existing entries ...
  tomXHigh: 50,
  octobanHi: 56,
  octobanLo: 58,
  gong: 39,
  crashDark: 55,
  rideSecondary: 59,
  splash: 54,
}
```

Then your songs in `base/song/<name>/index.ts` can use them immediately.
Verify with `pnpm play <name> --pattern <pattern>` to solo the section
that exercises the new pieces.

---

## 8. Sanity check

End-to-end test:

```bash
pnpm boot              # 4 hits. Kick + snare confirms the chain
pnpm play example      # 5/4 song should now use:
                       #   - tuned toms (descending chorus fill)
                       #   - china (chorus beat 1.5)
                       #   - ride bell (bridge ostinato)
                       #   - dark crash (chorus beat 4)
```

If a piece doesn't sound right, the issue is one of:

- Note number not mapped in SD3's Mapping window
- Stacked drum's velocity layer mismatched (too loud / too quiet)
- Mixer mute on the bus
- Tuning knob in semitones not cents (off by 100×)

---

## Bottom line

```
GUI work, once:
  load Progressive Foundry
  stack raw snare
  add 4 extra toms + tune them low → high
  add china, dark crash, second ride, splash
  bus + EQ
  save preset

TS work, repeatedly:
  reference the new note constants
  write patterns
  pnpm play
```

The TS engine never touches the kit configuration. SD3 is configured
once and stays put.
