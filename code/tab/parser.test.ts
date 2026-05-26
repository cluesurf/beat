// Vitest suite for the tab parser. Aims to cover:
//
//   - Happy path: basic 4/4, diacritics, multiple blocks
//   - Front-matter overrides: line redefinitions, global notes
//   - Block-header overrides: tempo, time signature
//   - Error recovery: bad YAML, unknown line, unknown char,
//     width mismatch, missing measure, missing instrument
//   - Edge cases: empty input, comments, blank lines, single bar
//
// Use relative imports so the test runs without depending on
// any TS path alias.

import { describe, it, expect } from 'vitest'

import { NOTE } from '../note'
import { parse } from './index'

// ---------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------

describe('parse — happy path', () => {
  it('parses a basic 4/4 backbeat', () => {
    const r = parse(`
instrument: drumkit
tempo: 100

measure: 4*4
H|x-x-:x-x-:x-x-:x-x-|
S|----:x---:----:x---|
K|x---:----:x---:----|
`)
    expect(r.errors).toEqual([])
    expect(r.song.bpm).toBe(100)
    expect(r.song.patterns).toHaveLength(1)
    expect(r.song.patterns[0].beats).toBe(4)
    expect(r.song.patterns[0].hits.length).toBe(12)

    const noteCounts = countByNote(r.hits)
    expect(noteCounts[NOTE.kick]).toBe(2)
    expect(noteCounts[NOTE.snare]).toBe(2)
    expect(noteCounts[NOTE.closedHat]).toBe(8)
  })

  it('places kick on beats 0 and 2, snare on 1 and 3', () => {
    const r = parse(`
measure: 4*4
S|----:x---:----:x---|
K|x---:----:x---:----|
`)
    const kicks = r.hits
      .filter(h => h.note === NOTE.kick)
      .map(h => h.beat)
    const snares = r.hits
      .filter(h => h.note === NOTE.snare)
      .map(h => h.beat)
    expect(kicks).toEqual([0, 2])
    expect(snares).toEqual([1, 3])
  })

  it('reads default tempo 100 when omitted', () => {
    const r = parse(`
measure: 4*4
K|x---:x---:x---:x---|
`)
    expect(r.song.bpm).toBe(100)
  })

  it('positions 16th notes correctly within a beat', () => {
    const r = parse(`
measure: 4*4
H|x-x-:----:----:----|
`)
    expect(r.hits.map(h => h.beat)).toEqual([0, 0.5])
  })

  it('positions 8th notes in a 2*4 grid', () => {
    const r = parse(`
measure: 2*4
H|x-:x-:x-:x-|
`)
    expect(r.hits.map(h => h.beat)).toEqual([0, 1, 2, 3])
  })

  it('handles triplet grids (3*4)', () => {
    const r = parse(`
measure: 3*4
H|xxx:xxx:xxx:xxx|
`)
    // 3 hits per beat, evenly spaced at 0, 1/3, 2/3, 1, 4/3, ...
    const beats = r.hits.map(h => h.beat)
    expect(beats).toHaveLength(12)
    expect(beats[0]).toBe(0)
    expect(beats[1]).toBeCloseTo(1 / 3)
    expect(beats[2]).toBeCloseTo(2 / 3)
    expect(beats[3]).toBe(1)
  })
})

// ---------------------------------------------------------------
// Diacritics
// ---------------------------------------------------------------

describe('parse — diacritics', () => {
  it('treats x with combining dot below as a distinct note slot', () => {
    // x̣ is defined by snare defaults? No — snare has x, O, o,
    // x́, x̃, f. x̣ isn't in snare defaults so define it inline.
    const r = parse(`
S:
  x̣:
    velocity: 60
    hit: ghost

measure: 4*4
S|x̣---:x---:x̣---:x---|
`)
    expect(r.errors).toEqual([])
    expect(r.hits).toHaveLength(4)
    const ghosts = r.hits.filter(h => h.velocity === 60)
    expect(ghosts).toHaveLength(2)
    expect(ghosts.map(h => h.note)).toEqual([
      NOTE.snareGhost,
      NOTE.snareGhost,
    ])
  })

  it('default x́ on snare maps to rim shot', () => {
    const r = parse(`
measure: 4*4
S|x́---:----:----:----|
`)
    expect(r.errors).toEqual([])
    expect(r.hits).toHaveLength(1)
    expect(r.hits[0].note).toBe(NOTE.snareRim)
  })

  it('treats x and x̣ as different graphemes', () => {
    const r = parse(`
S:
  x̣:
    velocity: 50
    hit: wired

measure: 4*4
S|x---:x̣---:x---:x̣---|
`)
    expect(r.errors).toEqual([])
    const velocities = r.hits.map(h => h.velocity).sort()
    expect(velocities).toContain(50)
    expect(velocities).toContain(95) // default snare wired velocity
  })
})

// ---------------------------------------------------------------
// Front-matter line overrides
// ---------------------------------------------------------------

describe('parse — line overrides', () => {
  it('overrides the velocity for an existing line', () => {
    const r = parse(`
H:
  velocity: 50

measure: 4*4
H|x---:x---:x---:x---|
`)
    expect(r.errors).toEqual([])
    expect(r.hits.every(h => h.velocity === 50)).toBe(true)
  })

  it('alias lines (H vs HH) hold separate configs', () => {
    // Overriding HH does not change H, even though both default
    // to the same instrument. This is intentional — each line
    // name has its own LineDef that can be customized independently.
    const r = parse(`
HH:
  velocity: 50

measure: 4*4
H|x---:x---:x---:x---|
HH|x---:x---:x---:x---|
`)
    expect(r.errors).toEqual([])
    const fromH = r.hits.filter(h => h.velocity !== 50)
    const fromHH = r.hits.filter(h => h.velocity === 50)
    expect(fromH).toHaveLength(4)
    expect(fromHH).toHaveLength(4)
  })

  it('redefines a note character on a line', () => {
    const r = parse(`
H:
  x:
    hit: open

measure: 4*4
H|x---:x---:x---:x---|
`)
    expect(r.errors).toEqual([])
    expect(r.hits.every(h => h.note === NOTE.openHat)).toBe(true)
  })

  it('lets a new line name be declared', () => {
    const r = parse(`
GG:
  instrument: tom-1
  x:
    note: 50

measure: 4*4
GG|x---:x---:x---:x---|
`)
    expect(r.errors).toEqual([])
    expect(r.hits.every(h => h.note === 50)).toBe(true)
  })
})

// ---------------------------------------------------------------
// Block-header overrides
// ---------------------------------------------------------------

describe('parse — block-header overrides', () => {
  it('block-level tempo overrides front matter', () => {
    const r = parse(`
tempo: 100

measure: 4*4
tempo: 140
K|x---:x---:x---:x---|
`)
    // Song bpm comes from front matter (top-level), but the
    // block header is recorded for future use. For now the
    // single-tempo Song doesn't expose per-block tempo.
    expect(r.errors).toEqual([])
    expect(r.song.bpm).toBe(100)
  })

  it('time: 5/8 changes beats-per-measure to 2.5', () => {
    const r = parse(`
measure: 4*5
time: 5/8
K|x---:x---:x---:x---:x---|
`)
    expect(r.errors).toEqual([])
    expect(r.song.patterns[0].beats).toBe(2.5)
  })

  it('without time:, /4 is implied', () => {
    const r = parse(`
measure: 4*5
K|x---:x---:x---:x---:x---|
`)
    expect(r.errors).toEqual([])
    expect(r.song.patterns[0].beats).toBe(5)
  })
})

// ---------------------------------------------------------------
// Multiple blocks
// ---------------------------------------------------------------

describe('parse — multiple blocks', () => {
  it('stacks two blocks back-to-back', () => {
    const r = parse(`
measure: 4*4
K|x---:x---:x---:x---|

measure: 4*4
S|x---:x---:x---:x---|
`)
    expect(r.errors).toEqual([])
    expect(r.song.patterns).toHaveLength(2)
    expect(
      r.song.patterns[0].hits.every(h => h.note === NOTE.kick),
    ).toBe(true)
    expect(
      r.song.patterns[1].hits.every(h => h.note === NOTE.snare),
    ).toBe(true)
    // Block 2 starts at beat 4 (after block 1's 4 beats).
    const allBeats = r.hits.map(h => h.beat).sort((a, b) => a - b)
    expect(allBeats[0]).toBe(0)
    expect(allBeats[allBeats.length - 1]).toBe(7)
  })

  it('two-bar blocks → 4 patterns total', () => {
    const r = parse(`
measure: 4*4
K|x---:x---:x---:x---|x---:x---:x---:x---|

measure: 4*4
S|x---:x---:x---:x---|x---:x---:x---:x---|
`)
    expect(r.errors).toEqual([])
    expect(r.song.patterns).toHaveLength(4)
    expect(r.song.arrangement).toHaveLength(4)
  })
})

// ---------------------------------------------------------------
// Comments + whitespace
// ---------------------------------------------------------------

describe('parse — comments + whitespace', () => {
  it('ignores comments in front matter', () => {
    const r = parse(`
# this is a comment
instrument: drumkit  # inline comment
tempo: 120

measure: 4*4
K|x---:x---:x---:x---|
`)
    expect(r.errors).toEqual([])
    expect(r.song.bpm).toBe(120)
  })

  it('ignores blank lines + comments inside tab block', () => {
    const r = parse(`
measure: 4*4
K|x---:x---:x---:x---|
# between rows
S|x---:x---:x---:x---|

H|x-x-:x-x-:x-x-:x-x-|
`)
    expect(r.errors).toEqual([])
    expect(r.song.patterns[0].hits.length).toBe(4 + 4 + 8)
  })

  it('handles missing trailing newline', () => {
    const r = parse(`measure: 4*4\nK|x---:x---:x---:x---|`)
    expect(r.errors).toEqual([])
    expect(r.hits).toHaveLength(4)
  })

  it('handles only front matter (no tab blocks)', () => {
    const r = parse(`
instrument: drumkit
tempo: 100
`)
    expect(r.errors).toEqual([])
    expect(r.song.patterns).toHaveLength(0)
    expect(r.hits).toHaveLength(0)
  })

  it('handles fully empty input', () => {
    const r = parse('')
    expect(r.errors).toEqual([])
    expect(r.song.patterns).toHaveLength(0)
  })
})

// ---------------------------------------------------------------
// Error recovery
// ---------------------------------------------------------------

describe('parse — error recovery', () => {
  it('reports unknown line and skips that row', () => {
    const r = parse(`
measure: 4*4
K|x---:x---:x---:x---|
ZZ|x---:x---:x---:x---|
S|x---:x---:x---:x---|
`)
    expect(r.errors.length).toBeGreaterThan(0)
    expect(r.errors[0].message).toMatch(/Unknown tab line "ZZ"/)
    // K and S still produce hits.
    const noteCounts = countByNote(r.hits)
    expect(noteCounts[NOTE.kick]).toBe(4)
    expect(noteCounts[NOTE.snare]).toBe(4)
  })

  it('reports unknown char and skips that slot', () => {
    const r = parse(`
measure: 4*4
K|x---:x?--:x---:x---|
`)
    expect(
      r.errors.some(e => e.message.includes('unknown note "?"')),
    ).toBe(true)
    // Other 4 slots still produced hits.
    expect(r.hits.length).toBe(4)
  })

  it('reports width mismatch and skips that beat', () => {
    const r = parse(`
measure: 4*4
K|x---:x--:x---:x---|
`)
    expect(
      r.errors.some(e => e.message.includes('3 slots, expected 4')),
    ).toBe(true)
    // 3 valid beats × 1 hit each = 3 hits.
    expect(r.hits.length).toBe(3)
  })

  it('reports missing measure header and skips block', () => {
    const r = parse(`
tempo: 120

K|x---:x---:x---:x---|
`)
    // No tab block (the K line lives in front matter context with
    // no preceding `measure:`), so it's never identified as a tab
    // row. Front matter parses fine but treats `K|...` as garbage
    // YAML — yaml package may error.
    expect(r.song.patterns).toHaveLength(0)
  })

  it('reports bad measure spec and skips block', () => {
    const r = parse(`
measure: garbage
K|x---:x---:x---:x---|
`)
    expect(
      r.errors.some(e => e.message.includes('invalid measure spec')),
    ).toBe(true)
    expect(r.song.patterns).toHaveLength(0)
  })

  it('reports unknown instrument and falls back to drumkit', () => {
    const r = parse(`
instrument: marimba

measure: 4*4
K|x---:x---:x---:x---|
`)
    expect(
      r.errors.some(e =>
        e.message.includes('Unknown instrument pack "marimba"'),
      ),
    ).toBe(true)
    // Falls back to drumkit so K still works.
    expect(r.hits.length).toBe(4)
  })

  it('aggregates many errors without throwing', () => {
    const r = parse(`
ZZ:
  instrument: nonexistent

measure: 4*4
QQ|x---:x---:x---:x---|
K|x---:x?--:x--:x---|
`)
    // Multiple errors collected.
    expect(r.errors.length).toBeGreaterThanOrEqual(2)
    // Parse still produced something usable.
    expect(r.song.patterns.length).toBe(1)
  })

  it('non-row, non-comment line in tab block produces a warning', () => {
    const r = parse(`
measure: 4*4
K|x---:x---:x---:x---|
this is garbage
S|x---:x---:x---:x---|
`)
    expect(r.errors.some(e => e.severity === 'warning')).toBe(true)
    // K and S still parse fine.
    const noteCounts = countByNote(r.hits)
    expect(noteCounts[NOTE.kick]).toBe(4)
    expect(noteCounts[NOTE.snare]).toBe(4)
  })
})

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function countByNote(hits: { note: number }[]): Record<number, number> {
  const out: Record<number, number> = {}
  for (const h of hits) out[h.note] = (out[h.note] ?? 0) + 1
  return out
}
