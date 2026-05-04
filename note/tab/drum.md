# Drum Tab Defaults

Defaults for `instrument: drumkit`. The generic format is in
[`spec.md`](./spec.md). This doc only covers what `drumkit` adds.

## Default lines

Use any of these as a tab row name without declaring it. Override its
config in front matter to customize.

| Line | Instrument  | Default articulation | MIDI note             |
| ---- | ----------- | -------------------- | --------------------- |
| `K`  | kick        | main                 | 36 (NOTE.kick)        |
| `S`  | snare       | wired                | 38 (NOTE.snare)       |
| `H`  | hihat       | closed               | 42 (NOTE.closedHat)   |
| `HH` | hihat       | closed (alias of H)  | 42                    |
| `Hp` | hihat-pedal | pedal                | 44 (NOTE.pedalHat)    |
| `T1` | tom-1       | main                 | 48 (NOTE.tomHigh)     |
| `T2` | tom-2       | main                 | 47 (NOTE.tomMid)      |
| `T3` | tom-3       | main                 | 45 (NOTE.tomLow)      |
| `T4` | tom-4       | main                 | 43 (NOTE.floorTom)    |
| `T5` | tom-5       | main                 | 41 (NOTE.floorTomLow) |
| `C`  | crash-1     | main                 | 49 (NOTE.crashLeft)   |
| `C1` | crash-1     | main (alias of C)    | 49                    |
| `C2` | crash-2     | main                 | 57 (NOTE.crashRight)  |
| `R`  | ride        | tip                  | 51 (NOTE.rideTip)     |
| `R1` | ride        | tip (alias of R)     | 51                    |
| `X`  | china       | main                 | 52 (NOTE.china)       |
| `L`  | splash      | main                 | 55 (NOTE.splash)      |

## Default note characters

Per-line defaults. Override in front matter only what differs.

### Hi-hat (`H` / `HH`)

| Char | Hit    | Velocity     |
| ---- | ------ | ------------ |
| `x`  | closed | 78           |
| `o`  | open   | 95           |
| `O`  | open   | 115 (accent) |
| `X`  | closed | 110 (accent) |

### Snare (`S`)

| Char | Hit   | Velocity     |
| ---- | ----- | ------------ |
| `x`  | wired | 95           |
| `O`  | wired | 118 (accent) |
| `o`  | ghost | 30           |
| `x́`  | rim   | 110          |
| `x̃`  | roll  | 80           |
| `f`  | wired | 105 + flam   |

### Kick (`K`)

| Char | Hit  | Velocity |
| ---- | ---- | -------- |
| `x`  | main | 100      |
| `o`  | main | 100      |
| `O`  | main | 120      |
| `d`  | main | 60       |

### Toms (`T1`..`T5`)

| Char | Hit  | Velocity     |
| ---- | ---- | ------------ |
| `x`  | main | 95           |
| `o`  | main | 95           |
| `O`  | main | 118 (accent) |

### Crashes / china / splash (`C`, `C1`, `C2`, `X`, `L`)

| Char | Hit   | Velocity              |
| ---- | ----- | --------------------- |
| `x`  | main  | 100                   |
| `X`  | main  | 120                   |
| `O`  | main  | 120 (accent)          |
| `c`  | choke | 1 (vel-1 = SD3 choke) |

### Ride (`R`)

| Char | Hit  | Velocity     |
| ---- | ---- | ------------ |
| `x`  | tip  | 90           |
| `b`  | bell | 105          |
| `O`  | tip  | 115 (accent) |

## Articulation → MIDI note maps

Every instrument has an articulation set. The default `main`
articulation is what `x` gets unless the line config says otherwise.

```
hihat        : closed → 42, open → 46, pedal → 44, foot → 44
snare        : wired → 38, ghost → 92, rim → 40, sidestick → 37,
               roll → 95, rim-only → 91
kick         : main → 36, alt → 35
hihat-pedal  : pedal → 44
tom-1..5     : main → 48 / 47 / 45 / 43 / 41
crash-1      : main → 49, choke → 71
crash-2      : main → 57, choke → 72
ride         : tip → 51, bell → 53, edge → 59, choke → 75
china        : main → 52, choke → 73
splash       : main → 55, choke → 74
```

Override any articulation by re-defining the line's instrument:

```yaml
T1:
  instrument: tom-1
  velocity: 100
  x:
    note: 50 # bypass the articulation table, use note 50 directly
```

## Conventional diacritics on drum tabs

These are how the project writes drum tabs by default. Re-bind any of
them in front matter if you want different meaning.

| Glyph | Meaning | Default note-char config                          |
| ----- | ------- | ------------------------------------------------- |
| `x`   | regular | velocity: 95 (line default)                       |
| `x̣`   | triplet | velocity: 60 — used as a flag, you control timing |
| `x́`   | accent  | velocity: 118                                     |
| `x̃`   | roll    | hit: roll                                         |
| `ẋ`   | ghost   | velocity: 30                                      |

> **Triplet timing:** the `̣` diacritic is a _label_. The parser reads it
> as a distinct note slot. To get triplet timing, use a triplet grid
> (`measure: 3*N` or `measure: 6*N`), not a 4-grid with `x̣` markers. The
> diacritic just lets you visually mark which hits are triplet-style for
> your own reference.

## Minimum tab to make sound

```yaml
instrument: drumkit
tempo: 100
```

```
measure: 4*4
K|x---:x---:x---:x---|
S|----:x---:----:x---|
H|x-x-:x-x-:x-x-:x-x-|
```

Three lines, no overrides — uses every default. Plays a basic 4/4
backbeat with hi-hat 8ths.

Each measure has 4 beats separated by `:` (mandatory), and each beat has
4 grid positions (16th-note resolution).
