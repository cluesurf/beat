// Parse a tab document — YAML front matter + one or more
// tab blocks — into a Song that the play / export commands
// can consume directly.
//
// Format spec: `note/tab/spec.md`
// Drum defaults: `note/tab/drum.md` + `code/tab/drum.ts`
//
// **Error recovery.** This parser tries to keep going past every
// kind of failure and report all problems at once. The caller
// gets back whatever was successfully parsed PLUS an `errors`
// array. Recovery rules:
//
//   - Bad YAML in front matter → use empty config, push error
//   - Unknown instrument → fall back to drumkit
//   - Bad line definition → skip that line definition
//   - Bad measure spec → skip the entire block
//   - Unknown line name in a row → skip the row
//   - Unknown char in a slot → skip the slot
//   - Width mismatch within a row → skip that measure
//   - Measure-count mismatch across rows → use the smallest count
//
// Throws only on unrecoverable internal errors (none currently).

import type { Hit, Pattern, Song } from '../song'
import type { HumanizeConfig } from '../humanize'
import { DRUM_CHANNEL } from '../note'
import { parse as parseYamlLib } from 'yaml'

type YamlValue = unknown
type YamlObject = Record<string, unknown>

function parseYaml(text: string): YamlObject {
  if (text.trim() === '') return {}
  const parsed = parseYamlLib(text) as unknown
  if (parsed === null || parsed === undefined) return {}
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('YAML root must be an object')
  }
  return parsed as YamlObject
}
import {
  DRUMKIT_INSTRUMENTS,
  DRUMKIT_LINES,
  resolveNoteSpec,
} from './drum'
import type {
  BlockHeader,
  DocumentConfig,
  InstrumentDef,
  LineDef,
  NoteSpec,
  ParseError,
  ParseResult,
  Velocity,
} from './types'

// ---------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------

export function parse(text: string): ParseResult {
  const errors: ParseError[] = []

  const { frontMatterText, blocks } = splitDocument(text)

  // Front matter — best-effort parse. On failure use empty config.
  let frontMatter: YamlObject = {}
  try {
    frontMatter = parseYaml(frontMatterText)
  } catch (err) {
    errors.push({
      severity: 'error',
      message: `front matter: ${(err as Error).message}`,
    })
  }

  const config = resolveConfig(frontMatter, errors)

  const allHits: Hit[] = []
  const patterns: Pattern[] = []
  const arrangement: { pattern: string }[] = []
  let beatCursor = 0
  let barIndex = 0
  // Track the active `part:` across blocks. Sticky — a block
  // without `part:` inherits the previous one. When a new part
  // starts, the local bar counter resets.
  let currentPart: string | null = null
  let localBarIndex = 0

  for (let blockIdx = 0; blockIdx < blocks.length; blockIdx++) {
    const blockText = blocks[blockIdx]
    const { header, rowLines } = splitBlock(
      blockText,
      errors,
      blockIdx + 1,
    )
    const inferred = inferFlowFromRows(rowLines)
    const block = resolveHeader(
      header,
      config,
      errors,
      blockIdx + 1,
      inferred,
    )
    if (!block) continue
    if (block.part && block.part !== currentPart) {
      currentPart = block.part
      localBarIndex = 0
    }
    const beatsPerMeasure = computeBeatsPerMeasure(block)
    const positionsPerMeasure =
      block.measure.subdivisions * block.measure.pulses

    // Pair each velocity row (no line name, just whitespace before
    // `|`) with the preceding main row. Velocity rows without a
    // host emit a warning and are dropped.
    type RowGroup = { main: string; velocity?: string }
    const grouped: RowGroup[] = []
    for (const line of rowLines) {
      const isVelocity =
        VELOCITY_ROW.test(line) && !TAB_ROW.test(line)
      if (isVelocity) {
        if (grouped.length === 0) {
          errors.push({
            severity: 'warning',
            message:
              `Velocity row "${line.trim()}" has no preceding tab ` +
              `row to attach to. Skipping.`,
            location: { block: blockIdx + 1 },
          })
          continue
        }
        grouped[grouped.length - 1]!.velocity = line
      } else {
        grouped.push({ main: line })
      }
    }

    const parsedRows = grouped
      .map(g =>
        parseRow(
          g.main,
          g.velocity,
          config,
          positionsPerMeasure,
          errors,
          blockIdx + 1,
        ),
      )
      .filter((r): r is RowParse => r !== null)
    if (parsedRows.length === 0) continue

    // If rows disagree on measure count, use the minimum so we
    // don't wander off the end of any one row.
    const measureCount = Math.min(
      ...parsedRows.map(r => r.measures.length),
    )
    for (const row of parsedRows) {
      if (row.measures.length !== measureCount) {
        errors.push({
          severity: 'error',
          message:
            `Row "${row.lineName}" has ${row.measures.length} measures, ` +
            `using shortest (${measureCount}).`,
          location: { block: blockIdx + 1, row: row.lineName },
        })
      }
    }

    const slotsPerBeat = block.rate
      ? block.rate.slots / block.rate.beats
      : block.measure.subdivisions

    for (let m = 0; m < measureCount; m++) {
      barIndex++
      localBarIndex++
      const measureHits: Hit[] = []
      for (const row of parsedRows) {
        const measure = row.measures[m]
        if (!measure) continue
        for (const hit of measure) {
          measureHits.push({ ...hit, beat: beatCursor + hit.beat })
        }
      }
      measureHits.sort((a, b) => a.beat - b.beat)
      const retimed = retimeTriplets(
        measureHits,
        slotsPerBeat,
        beatCursor,
      )
      retimed.sort((a, b) => a.beat - b.beat)
      allHits.push(...retimed)

      const patternName = currentPart
        ? `${currentPart}-${localBarIndex}`
        : `bar-${String(barIndex).padStart(3, '0')}`
      patterns.push({
        name: patternName,
        beats: beatsPerMeasure,
        hits: retimed.map(h => ({
          ...h,
          beat: h.beat - beatCursor,
        })),
      })
      arrangement.push({ pattern: patternName })
      beatCursor += beatsPerMeasure
    }
  }

  const song: Song = {
    name: 'Tab Document',
    bpm: config.tempo,
    patterns,
    arrangement,
    humanize: config.humanize,
  }

  return { config, song, hits: allHits, errors }
}

// ---------------------------------------------------------------
// Document splitting
// ---------------------------------------------------------------

// The "start a new block" trigger. Either `flow:` (new) or
// `measure:` (legacy) signals that a tab block follows.
const MEASURE_KEY = /^(flow|measure)\s*:/
const TAB_ROW = /^\s*[A-Z][A-Za-z0-9-]*\s*\|/
// Velocity row: same shape as a tab row but with no line name —
// just whitespace before the leading `|`. Each digit 0-9 in a
// slot overrides the velocity of the corresponding hit in the
// preceding named row.
const VELOCITY_ROW = /^\s+\|/

// Velocity-row glyphs. Digits 0-9 each map to a 13-unit MIDI
// velocity bucket — `mid` is the midpoint (rounded up) used as
// the default value; `min`/`max` clamp humanize jitter so
// dynamics never cross a bucket boundary.
//
// Letter aliases overlay sheet-music dynamics on top of those
// buckets — each picks a specific velocity within the bucket
// it falls into:
//   p / s = 15 (piano / soft)        — bucket 1
//   P / S = 35 (piano strong)        — bucket 2
//   m     = 55 (mezzo)               — bucket 4
//   M     = 75 (mezzo-forte)         — bucket 6
//   f / h = 100 (forte / hard)       — bucket 8
//   F / H = 120 (fortissimo / hard)  — bucket 9
const VELOCITY_BUCKETS: Record<
  string,
  { mid: number; min: number; max: number }
> = {
  '0': { mid: 7, min: 1, max: 12 },
  '1': { mid: 19, min: 13, max: 24 },
  '2': { mid: 31, min: 25, max: 36 },
  '3': { mid: 43, min: 37, max: 48 },
  '4': { mid: 55, min: 49, max: 60 },
  '5': { mid: 67, min: 61, max: 72 },
  '6': { mid: 79, min: 73, max: 84 },
  '7': { mid: 91, min: 85, max: 96 },
  '8': { mid: 103, min: 97, max: 108 },
  '9': { mid: 118, min: 109, max: 127 },
  p: { mid: 15, min: 13, max: 24 },
  s: { mid: 15, min: 13, max: 24 },
  P: { mid: 35, min: 25, max: 36 },
  S: { mid: 35, min: 25, max: 36 },
  m: { mid: 55, min: 49, max: 60 },
  M: { mid: 75, min: 73, max: 84 },
  f: { mid: 100, min: 97, max: 108 },
  h: { mid: 100, min: 97, max: 108 },
  F: { mid: 120, min: 109, max: 127 },
  H: { mid: 120, min: 109, max: 127 },
}
// Lines with these keys, when they appear immediately before a
// `flow:` / `measure:` line (no blank line in between), get pulled
// into the new block. Lets authors write:
//   part: bridge-2
//   flow: 7:4
//   rate: 4:1
//   ...rows...
// instead of having to remember to put `part:` after the block
// start.
const BLOCK_HEADER_KEY = /^(part|time|rate|tempo|humanize)\s*:/

function splitDocument(text: string): {
  frontMatterText: string
  blocks: string[]
} {
  const lines = text.split('\n')
  const blocks: string[][] = []
  const frontMatter: string[] = []
  let current: string[] | null = null

  for (const line of lines) {
    if (MEASURE_KEY.test(line.trimStart())) {
      if (current) blocks.push(current)
      // Look back through the contiguous (non-blank, non-comment)
      // tail of the previous bucket. Any block-header keys there
      // belong to THIS new block, not the previous bucket.
      const target = current ?? frontMatter
      const pulled: string[] = []
      while (target.length > 0) {
        const last = target[target.length - 1]!
        const trimmed = last.trim()
        if (trimmed === '' || trimmed.startsWith('#')) break
        if (!BLOCK_HEADER_KEY.test(last.trimStart())) break
        pulled.unshift(last)
        target.pop()
      }
      current = [...pulled, line]
    } else if (current) {
      current.push(line)
    } else {
      frontMatter.push(line)
    }
  }
  if (current) blocks.push(current)

  return {
    frontMatterText: frontMatter.join('\n'),
    blocks: blocks.map(b => b.join('\n')),
  }
}

function splitBlock(
  blockText: string,
  errors: ParseError[],
  blockNumber: number,
): { header: YamlObject; rowLines: string[] } {
  const lines = blockText.split('\n')
  const headerLines: string[] = []
  const rowLines: string[] = []
  let inRows = false

  for (const line of lines) {
    if (TAB_ROW.test(line) || VELOCITY_ROW.test(line)) {
      inRows = true
      rowLines.push(line)
      continue
    }
    if (inRows) {
      // Allow blank + comment lines between row groups; flag others.
      if (line.trim() === '' || line.trimStart().startsWith('#'))
        continue
      errors.push({
        severity: 'warning',
        message: `Skipped non-row line inside tab block: "${line.trim()}"`,
        location: { block: blockNumber },
      })
      continue
    }
    headerLines.push(line)
  }

  let header: YamlObject = {}
  try {
    header = parseYaml(headerLines.join('\n'))
  } catch (err) {
    errors.push({
      severity: 'error',
      message: `block header: ${(err as Error).message}`,
      location: { block: blockNumber },
    })
  }
  return { header, rowLines }
}

// ---------------------------------------------------------------
// Configuration resolution
// ---------------------------------------------------------------

function resolveConfig(
  yaml: YamlObject,
  errors: ParseError[],
): DocumentConfig {
  let instrument = (
    asString(yaml.instrument) ?? 'drumkit'
  ).toLowerCase()
  const tempo = asNumber(yaml.tempo) ?? 100
  const humanize = asHumanize(yaml.humanize)

  if (instrument !== 'drumkit') {
    errors.push({
      severity: 'error',
      message: `Unknown instrument "${instrument}", falling back to drumkit.`,
    })
    instrument = 'drumkit'
  }

  const lines: Record<string, LineDef> = {}
  for (const [name, def] of Object.entries(DRUMKIT_LINES)) {
    lines[name] = { ...def, notes: { ...def.notes } }
  }
  const globalNotes: Record<string, NoteSpec> = {}

  for (const [key, value] of Object.entries(yaml)) {
    if (['instrument', 'tempo', 'humanize'].includes(key)) continue

    if (/^[A-Z]/.test(key)) {
      const obj = asObject(value)
      if (!obj) {
        errors.push({
          severity: 'error',
          message: `Line "${key}" must be an object, skipping.`,
        })
        continue
      }
      const merged = mergeLine(lines[key], obj, key, errors)
      if (merged) lines[key] = merged
    } else {
      const obj = asObject(value)
      if (!obj) {
        errors.push({
          severity: 'error',
          message: `Note "${key}" must be an object, skipping.`,
        })
        continue
      }
      globalNotes[key] = parseNoteSpec(obj)
    }
  }

  return { instrument, tempo, humanize, lines, globalNotes }
}

function mergeLine(
  existing: LineDef | undefined,
  override: YamlObject,
  lineName: string,
  errors: ParseError[],
): LineDef | undefined {
  const instrument =
    asString(override.instrument) ?? existing?.instrument
  if (!instrument) {
    errors.push({
      severity: 'error',
      message: `Line "${lineName}" missing 'instrument:' and no default exists, skipping.`,
    })
    return undefined
  }
  const merged: LineDef = {
    instrument,
    velocity: asVelocity(override.velocity) ?? existing?.velocity,
    humanize: asHumanize(override.humanize) ?? existing?.humanize,
    notes: { ...(existing?.notes ?? {}) },
  }
  for (const [key, value] of Object.entries(override)) {
    if (['instrument', 'velocity', 'humanize'].includes(key)) continue
    const obj = asObject(value)
    if (!obj) {
      errors.push({
        severity: 'error',
        message: `Line "${lineName}" note "${key}" must be an object, skipping.`,
      })
      continue
    }
    merged.notes[key] = parseNoteSpec(obj)
  }
  return merged
}

function parseNoteSpec(obj: YamlObject): NoteSpec {
  return {
    velocity: asVelocity(obj.velocity),
    hit: asString(obj.hit),
    note: asNumber(obj.note),
    flam: asNumber(obj.flam),
  }
}

// ---------------------------------------------------------------
// Block-header resolution
// ---------------------------------------------------------------

function resolveHeader(
  header: YamlObject,
  config: DocumentConfig,
  errors: ParseError[],
  blockNumber: number,
  inferred: { segments: number; slots: number } | null,
): BlockHeader | null {
  // Prefer explicit `flow: A:B`. Fall back to legacy
  // `measure: M*N` (M=subdivisions, N=pulses). Fall back to
  // inferring from the tab rows.
  let segments: number | null = null
  let slots: number | null = null

  const flowText = asString(header.flow)
  if (flowText) {
    const f = /^(\d+)\s*:\s*(\d+)$/.exec(flowText)
    if (!f) {
      errors.push({
        severity: 'error',
        message:
          `Block ${blockNumber}: invalid flow spec "${flowText}", ` +
          `expected "segments:slots" (e.g. 7:4).`,
        location: { block: blockNumber },
      })
      return null
    }
    segments = Number(f[1])
    slots = Number(f[2])
  } else {
    const measureText = asString(header.measure)
    if (measureText) {
      const m = /^(\d+)\s*\*\s*(\d+(?:\.\d+)?)$/.exec(measureText)
      if (!m) {
        errors.push({
          severity: 'error',
          message:
            `Block ${blockNumber}: invalid measure spec ` +
            `"${measureText}", expected "M*N".`,
          location: { block: blockNumber },
        })
        return null
      }
      // measure: M*N → M = slots per segment, N = segments
      slots = Number(m[1])
      segments = Number(m[2])
    }
  }

  if (segments === null || slots === null) {
    if (!inferred) {
      errors.push({
        severity: 'error',
        message:
          `Tab block ${blockNumber} missing 'flow:' or 'measure:' ` +
          `and no tab rows to infer from. Skipping block.`,
        location: { block: blockNumber },
      })
      return null
    }
    segments = inferred.segments
    slots = inferred.slots
  } else if (inferred) {
    // Validate the explicit spec against the ASCII.
    if (
      inferred.segments !== segments ||
      inferred.slots !== slots
    ) {
      errors.push({
        severity: 'error',
        message:
          `Block ${blockNumber}: declared flow ${segments}:${slots} ` +
          `does not match tab rows ` +
          `(rows have ${inferred.segments} segments × ` +
          `${inferred.slots} slots).`,
        location: { block: blockNumber },
      })
    }
  }

  // Rate: X:Y → X slots = Y BPM beats. Defaults to 4:1 (4 slots
  // per quarter-note beat, i.e. each slot is a 16th note).
  let rate: BlockHeader['rate'] = { slots: 4, beats: 1 }
  const rateText = asString(header.rate)
  if (rateText) {
    const r = /^(\d+)\s*:\s*(\d+)$/.exec(rateText)
    if (!r) {
      errors.push({
        severity: 'error',
        message:
          `Block ${blockNumber}: invalid rate spec "${rateText}", ` +
          `expected "slots:beats" (e.g. 4:1).`,
        location: { block: blockNumber },
      })
    } else {
      rate = { slots: Number(r[1]), beats: Number(r[2]) }
    }
  }

  let time: BlockHeader['time']
  const timeText = asString(header.time)
  if (timeText) {
    const t = /^(\d+)\s*\/\s*(\d+)$/.exec(timeText)
    if (!t) {
      errors.push({
        severity: 'error',
        message: `Block ${blockNumber}: invalid time spec "${timeText}", ignoring.`,
        location: { block: blockNumber },
      })
    } else {
      time = { numerator: Number(t[1]), denominator: Number(t[2]) }
    }
  }

  return {
    measure: { subdivisions: slots, pulses: segments },
    rate,
    time,
    tempo: asNumber(header.tempo) ?? config.tempo,
    humanize: asHumanize(header.humanize) ?? config.humanize,
    part: asString(header.part),
  }
}

// Look at the first well-formed `|seg:seg:...:seg|` row in a
// block and read off its structure. Returns null if no rows are
// usable (block has no tab content, or rows are malformed).
function inferFlowFromRows(
  rowLines: string[],
): { segments: number; slots: number } | null {
  for (const line of rowLines) {
    const pipeStart = line.indexOf('|')
    const pipeEnd = line.lastIndexOf('|')
    if (pipeStart < 0 || pipeEnd <= pipeStart) continue
    const inner = line.slice(pipeStart + 1, pipeEnd)
    const groups = inner.split(':')
    if (groups.length === 0) continue
    const slotsCount = groups[0]!.length
    if (slotsCount === 0) continue
    if (!groups.every(g => g.length === slotsCount)) continue
    return { segments: groups.length, slots: slotsCount }
  }
  return null
}

// Post-parse triplet re-timer. Scan a measure's hits column by
// column (across all rows). Any contiguous run of slot positions
// that has at least one dotted hit (`x̣`) is a triplet group; the
// dotted hits within that group are re-timed so the group's
// duration shrinks to 2/3 of its straight-time span (the standard
// "3 in the time of 2" triplet). Non-dotted hits in the same
// columns play at their straight slot positions.
//
// Strips the internal `slot` and `triplet` metadata from every
// returned hit so they don't leak past the parser.
function retimeTriplets(
  hits: Hit[],
  slotsPerBeat: number,
  measureStartBeat: number,
): Hit[] {
  const tripletSlots = new Set<number>()
  for (const hit of hits) {
    if (hit.triplet && hit.slot !== undefined) {
      tripletSlots.add(hit.slot)
    }
  }
  if (tripletSlots.size === 0) return hits.map(stripParseMeta)

  const sorted = [...tripletSlots].sort((a, b) => a - b)
  const groups: Array<{ start: number; end: number }> = []
  let gs = sorted[0]!
  let ge = sorted[0]!
  for (let i = 1; i < sorted.length; i++) {
    const s = sorted[i]!
    if (s === ge + 1) {
      ge = s
    } else {
      groups.push({ start: gs, end: ge })
      gs = s
      ge = s
    }
  }
  groups.push({ start: gs, end: ge })

  // No compression: 3 evenly-spaced x̣s in a group already give
  // the user's expected "1/2 the beat", "1 beat", etc. since the
  // slot positions themselves encode the spacing. The triplet
  // metadata stays as a flag (kept for future velocity/visual
  // treatment) but timing matches the slot grid.
  return hits.map(stripParseMeta)
}

function stripParseMeta(hit: Hit): Hit {
  // Keep velocityMin/velocityMax — humanize needs them at play
  // time. Drop the parse-only fields (slot, triplet).
  const { slot: _slot, triplet: _triplet, ...rest } = hit
  return rest
}

function computeBeatsPerMeasure(block: BlockHeader): number {
  // Preferred: derive from rate. slotsPerMeasure / slotsPerBeat.
  if (block.rate) {
    const slotsPerMeasure =
      block.measure.subdivisions * block.measure.pulses
    const slotsPerBeat = block.rate.slots / block.rate.beats
    return slotsPerMeasure / slotsPerBeat
  }
  // Legacy: pulses × (4 / time.denominator) quarter notes.
  const denominator = block.time?.denominator ?? 4
  const pulseInQuarters = 4 / denominator
  return block.measure.pulses * pulseInQuarters
}

// ---------------------------------------------------------------
// Tab-row parsing
// ---------------------------------------------------------------

type RowParse = {
  lineName: string
  measures: Hit[][]
}

function parseRow(
  rowText: string,
  velocityText: string | undefined,
  config: DocumentConfig,
  positionsPerMeasure: number,
  errors: ParseError[],
  blockNumber: number,
): RowParse | null {
  const pipeIdx = rowText.indexOf('|')
  if (pipeIdx < 0) return null

  const lineName = rowText.slice(0, pipeIdx).trim()
  const lineDef = config.lines[lineName]
  if (!lineDef) {
    const known = Object.keys(config.lines).sort().join(', ')
    errors.push({
      severity: 'error',
      message: `Unknown tab line "${lineName}" (known: ${known}), skipping row.`,
      location: { block: blockNumber, row: lineName },
    })
    return null
  }
  const instrumentDef = DRUMKIT_INSTRUMENTS[lineDef.instrument]
  if (!instrumentDef) {
    errors.push({
      severity: 'error',
      message: `Line "${lineName}" → unknown instrument "${lineDef.instrument}", skipping row.`,
      location: { block: blockNumber, row: lineName },
    })
    return null
  }

  const measureTexts = rowText
    .slice(pipeIdx + 1)
    .split('|')
    .filter(s => s.length > 0)

  const velocityMeasureTexts =
    velocityText !== undefined
      ? velocityText
          .slice(velocityText.indexOf('|') + 1)
          .split('|')
          .filter(s => s.length > 0)
      : []

  const measures: Hit[][] = []
  for (let m = 0; m < measureTexts.length; m++) {
    const hits = parseMeasure(
      measureTexts[m],
      velocityMeasureTexts[m],
      lineName,
      m + 1,
      blockNumber,
      lineDef,
      instrumentDef,
      config.globalNotes,
      positionsPerMeasure,
      errors,
    )
    measures.push(hits)
  }

  return { lineName, measures }
}

function parseMeasure(
  measureText: string,
  velocityText: string | undefined,
  lineName: string,
  measureNumber: number,
  blockNumber: number,
  lineDef: LineDef,
  instrumentDef: InstrumentDef,
  globalNotes: Record<string, NoteSpec>,
  positionsPerMeasure: number,
  errors: ParseError[],
): Hit[] {
  const beats = measureText.split(':')
  const velocityBeats =
    velocityText !== undefined ? velocityText.split(':') : []
  const expectedPositionsPerBeat = positionsPerMeasure / beats.length
  if (!Number.isInteger(expectedPositionsPerBeat)) {
    errors.push({
      severity: 'error',
      message:
        `Row "${lineName}" measure ${measureNumber}: ` +
        `${beats.length} beats doesn't divide ${positionsPerMeasure} positions evenly. Skipping measure.`,
      location: {
        block: blockNumber,
        row: lineName,
        measure: measureNumber,
      },
    })
    return []
  }

  const out: Hit[] = []
  for (let b = 0; b < beats.length; b++) {
    const beatText = beats[b]
    const slots = graphemes(beatText)
    const velocitySlots =
      velocityBeats[b] !== undefined ? graphemes(velocityBeats[b]) : []
    if (slots.length !== expectedPositionsPerBeat) {
      errors.push({
        severity: 'error',
        message:
          `Row "${lineName}" measure ${measureNumber} beat ${b + 1}: ` +
          `${slots.length} slots, expected ${expectedPositionsPerBeat}. Skipping beat.`,
        location: {
          block: blockNumber,
          row: lineName,
          measure: measureNumber,
          beat: b + 1,
        },
      })
      continue
    }
    for (let p = 0; p < slots.length; p++) {
      let slot = slots[p]
      const velocityGlyph = velocitySlots[p]
      const velocityBucket =
        velocityGlyph && VELOCITY_BUCKETS[velocityGlyph]
          ? VELOCITY_BUCKETS[velocityGlyph]
          : undefined
      // A velocity-row digit on an otherwise-empty slot implies
      // a default `x` hit at that slot with the bucket's
      // velocity — saves typing the `x` in the main row.
      if ((slot === '-' || slot === ' ') && velocityBucket) {
        slot = 'x'
      }
      if (slot === '-' || slot === ' ') continue
      // Combining dot-below (U+0323) marks a triplet candidate.
      // Strip it for the note lookup so `x̣` resolves the same as
      // `x` — the triplet semantics live in the re-timer, not the
      // glyph table.
      const isTriplet = slot.includes('̣')
      const lookup = isTriplet ? slot.replace(/̣/g, '') : slot
      const spec = resolveNoteSpec(
        lookup,
        lineDef,
        instrumentDef,
        globalNotes,
      )
      if (!spec) {
        errors.push({
          severity: 'error',
          message:
            `Row "${lineName}" measure ${measureNumber} beat ${
              b + 1
            } ` +
            `position ${p + 1}: unknown note "${slot}". Skipping slot.`,
          location: {
            block: blockNumber,
            row: lineName,
            measure: measureNumber,
            beat: b + 1,
            position: p + 1,
          },
        })
        continue
      }
      const beatPos = b + p / slots.length
      const slotIdx = b * slots.length + p
      const note = resolveNote(spec, instrumentDef, errors, lineName)
      if (note === null) continue
      // Velocity row digit, if present, wins over the symbol's
      // default. Otherwise fall back to resolveVelocity's chain
      // (per-note spec → line → instrument default).
      const velocity = velocityBucket
        ? velocityBucket.mid
        : resolveVelocity(spec, lineDef, instrumentDef)
      out.push({
        beat: beatPos,
        note,
        velocity,
        channel: DRUM_CHANNEL,
        ...(isTriplet ? { triplet: true } : {}),
        ...(velocityBucket
          ? {
              velocityMin: velocityBucket.min,
              velocityMax: velocityBucket.max,
            }
          : {}),
        slot: slotIdx,
      })
      if (spec.flam !== undefined) {
        out.push({
          beat: beatPos - spec.flam,
          note,
          velocity: 50,
          channel: DRUM_CHANNEL,
        })
      }
    }
  }
  return out
}

function resolveNote(
  spec: NoteSpec,
  instrument: InstrumentDef,
  errors: ParseError[],
  lineName: string,
): number | null {
  if (spec.note !== undefined) return spec.note
  const articulation = spec.hit ?? instrument.defaultArticulation
  const note = instrument.articulations[articulation]
  if (note === undefined) {
    errors.push({
      severity: 'error',
      message:
        `Row "${lineName}": instrument "${instrument.name}" ` +
        `has no articulation "${articulation}", skipping note.`,
    })
    return null
  }
  return note
}

function resolveVelocity(
  spec: NoteSpec,
  line: LineDef,
  instrument: InstrumentDef,
): number {
  const velocity =
    spec.velocity ?? line.velocity ?? instrument.defaultVelocity
  return pickVelocity(velocity)
}

function pickVelocity(v: Velocity): number {
  if (Array.isArray(v)) {
    const [lo, hi] = v
    return Math.round(lo + Math.random() * (hi - lo))
  }
  return v
}

// ---------------------------------------------------------------
// Grapheme iteration
// ---------------------------------------------------------------

const segmenter = new Intl.Segmenter('und', { granularity: 'grapheme' })

function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), s => s.segment)
}

// ---------------------------------------------------------------
// YAML value coercion helpers
// ---------------------------------------------------------------

function asString(v: YamlValue | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function asNumber(v: YamlValue | undefined): number | undefined {
  return typeof v === 'number' ? v : undefined
}

function asObject(v: YamlValue | undefined): YamlObject | undefined {
  if (v === null || v === undefined) return undefined
  if (typeof v !== 'object' || Array.isArray(v)) return undefined
  return v as YamlObject
}

function asVelocity(v: YamlValue | undefined): Velocity | undefined {
  if (typeof v === 'number') return v
  if (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === 'number' &&
    typeof v[1] === 'number'
  ) {
    return [v[0], v[1]]
  }
  return undefined
}

function asHumanize(
  v: YamlValue | undefined,
): HumanizeConfig | undefined {
  if (typeof v === 'string') {
    return { timing: 0.015, velocity: 6 }
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as HumanizeConfig
  }
  return undefined
}
