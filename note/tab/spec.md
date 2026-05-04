# Tab Format Spec

Generic, instrument-agnostic text tab format. Pluggable instrument
defaults make a drumkit tab (`instrument: drumkit`) the same parser as a
guitar tab (`instrument: guitar`), a piano tab, etc.

This spec defines the **format**. For the drumkit defaults see
[`drum.md`](./drum.md).

## At a glance

```yaml
instrument: drumkit
tempo: 104
humanize: subtle

x:
  velocity: 80
x̣:
  velocity: 60 # combining dot below. Convention: "triplet"

HH:
  instrument: hihat
  velocity: [80, 110]
  x: { hit: closed }
  o: { hit: open }
```

```
measure: 4*5
HH|x̣---:x-o-:o---:----:----|x---:x---:----:----:----|
 S|--x́-:----:----:----:----|----:----:----:----:----|
T1|----:----:----:----:----|----:----:----:----:----|
```

## File structure

A tab document has **two parts**:

1. **Front matter**. YAML at the top of the file
2. **Tab blocks**. One or more, each prefixed by its own YAML
   mini-header

A tab block ends where the next tab block's mini-header begins, or at
EOF.

## Front matter

Optional YAML keys:

| Key           | Type             | Meaning                               |
| ------------- | ---------------- | ------------------------------------- |
| `instrument`  | string           | Instrument family (e.g., `drumkit`)   |
| `tempo`       | number           | Default BPM (quarter-note pulses)     |
| `humanize`    | string \| object | Default humanize preset or config     |
| `<note-char>` | object           | Global note character definition      |
| `<NAME>`      | object           | Instrument line definition / override |

`<NAME>` is one or more uppercase ASCII letters / digits (e.g. `H`,
`HH`, `T1`). Anything else at the top level is ignored.

## Note characters

A **note character** is a single grapheme cluster. One base char plus
zero or more combining diacritics. Each unique grapheme is its own slot.

```yaml
x: # base char alone
  velocity: 80
x̣: # x + combining dot below (̣)
  velocity: 60
x́: # x + combining acute (́)
  velocity: 110
x̃: # x + combining tilde (̃)
  velocity: 95
```

Diacritic meanings are **purely conventional**. The parser treats each
unique grapheme as a distinct note type. By project convention:

| Diacritic    | Conventional meaning |
| ------------ | -------------------- |
| (none)       | regular hit          |
| ̣ (dot below) | triplet              |
| ́ (acute)     | accent               |
| ̃ (tilde)     | roll                 |
| ̇ (dot above) | ghost                |

But you can re-define any character to mean anything via its YAML entry.

### Note-character fields

| Field      | Type                 | Meaning                                  |
| ---------- | -------------------- | ---------------------------------------- |
| `velocity` | number \| `[lo, hi]` | MIDI velocity. Range = random ∈ [lo, hi] |
| `hit`      | string               | Articulation name (instrument-specific)  |
| `note`     | number               | Direct MIDI note override (1-127)        |

A note can be defined at three scopes (most-specific wins):

1. Inside a **line definition** (`HH: { x: { ... } }`)
2. At the **front-matter top level** (`x: { ... }`)
3. **Instrument default** (from `code/tab/drum.ts` etc.)

## Instrument lines

Each tab row begins with an uppercase **line name**. `H`, `HH`, `S`,
`T1`, etc. The line name maps to an instrument + per-line config.

For `instrument: drumkit`, [`drum.md`](./drum.md) lists every default
line.

### Line-definition fields

| Field         | Type                 | Meaning                            |
| ------------- | -------------------- | ---------------------------------- |
| `instrument`  | string               | Instrument name (e.g. `hihat`)     |
| `velocity`    | number \| `[lo, hi]` | Default velocity for this line     |
| `humanize`    | string \| object     | Per-line humanize override         |
| `<note-char>` | object               | Note-char definition for this line |

Define / override a line in front matter:

```yaml
HH:
  instrument: hihat
  velocity: [80, 110]
  x:
    hit: closed
  o:
    hit: open
```

Or use the instrument's default line config and override one field:

```yaml
HH:
  velocity: [60, 90] # quieter than default, everything else inherited
```

## Tab blocks

Each tab block has a YAML mini-header followed by tab rows.

### Mini-header fields

| Field      | Type             | Meaning                              |
| ---------- | ---------------- | ------------------------------------ |
| `measure`  | string `M*N`     | Grid resolution × pulses per measure |
| `tempo`    | number           | BPM override for this block          |
| `humanize` | string \| object | Humanize override for this block     |

The mini-header lines come **immediately before** the tab rows. No blank
line between them. The block ends when the next mini-header (a line
matching `^[a-z]+:`) appears, or at EOF.

### Measure spec. `M*N`

- **N** = pulses per measure (matches the time-signature numerator)
- **M** = grid sub-positions per pulse
- **One pulse = one quarter note** (standard BPM convention)

| Time sig + grid     | `measure:` | Total grid positions |
| ------------------- | ---------- | -------------------- |
| 4/4 with 16th notes | `4*4`      | 16                   |
| 5/4 with 16th notes | `4*5`      | 20                   |
| 7/8 with 16th notes | `4*7`      | 28                   |
| 5/8 with 16th notes | `4*5`      | 20                   |
| 4/4 with 32nd notes | `8*4`      | 32                   |
| 4/4 with 8th notes  | `2*4`      | 8                    |

## Tab rows

```
<NAME>|<measure-1>|<measure-2>|...|
```

- The line name is **left-aligned** with optional leading spaces (so
  multi-char names line up with single-char ones).
- Measures are separated by `|`.
- Within a measure, beats are separated by `:`.
- Each beat has exactly **M** grapheme slots (the grid resolution).
- `-` (or space) means silence.
- Any other grapheme is a note. The parser looks it up in the line's
  note-char map.

### Vertical alignment is **required**

Every measure across every row contains the same number of grapheme
slots **and** the same number of `:` separators. The parser enforces
this. A mismatch throws a parse error citing the offending row.

Line-name padding matters. A single-char name like `S` must be padded
with a leading space so its `|` lines up with `HH|` and `T1|`.

Right:

```
HH|x---:o---:x-x-:o---|
 S|----:x---:----:x---|
T1|----:----:--x-:----|
```

Wrong (`S` beat 1 has only 3 slots):

```
HH|x---:o---:x-x-:o---|
 S|---:x---:----:x---|       ← parse error
```

### Comments

Lines starting with `#` (after optional whitespace) are ignored. Inline
comments after `#` on YAML lines are also ignored.

## Multiple tab blocks

A document may have many tab blocks. They concatenate in order. Bar N+1
of block 2 directly follows the last bar of block 1.

```
measure: 4*4
H|x-x-:x-x-:x-x-:x-x-|
S|----:x---:----:x---|
K|x---:----:x---:----|

measure: 4*5
H|x-x-:x-x-:x-x-:x-x-:x-x-|
S|----:x---:----:x---:----|
K|x---:----:x---:--x-:x---|
```

Note the colons inside each measure. They're **mandatory beat
separators**, not cosmetic. The parser uses them to count beats.

## Output

`parseTabDocument(text)` returns:

```ts
{
  config: TabDocumentConfig    // resolved front matter
  bars: BarInfo[]              // one entry per played bar
  hits: Hit[]                  // sorted by absolute beat
}
```

The `Hit[]` plugs into `expandSong()` / `humanize()` /
`exportSongToMidi()` just like any hand-rolled hits.
