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
    const block = resolveHeader(header, config, errors, blockIdx + 1)
    if (!block) continue
    if (block.part && block.part !== currentPart) {
      currentPart = block.part
      localBarIndex = 0
    }
    const beatsPerMeasure = computeBeatsPerMeasure(block)
    const positionsPerMeasure =
      block.measure.subdivisions * block.measure.pulses

    const parsedRows = rowLines
      .map(line =>
        parseRow(
          line,
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
      allHits.push(...measureHits)

      const patternName = currentPart
        ? `${currentPart}-${localBarIndex}`
        : `bar-${String(barIndex).padStart(3, '0')}`
      patterns.push({
        name: patternName,
        beats: beatsPerMeasure,
        hits: measureHits.map(h => ({
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

const MEASURE_KEY = /^measure\s*:/
const TAB_ROW = /^\s*[A-Z][A-Za-z0-9-]*\s*\|/
// Lines with these keys, when they appear immediately before a
// `measure:` line (no blank line in between), get pulled into the
// new block. Lets authors write:
//   part: bridge-2
//   measure: 4*5
//   ...rows...
// instead of having to remember to put `part:` after `measure:`.
const BLOCK_HEADER_KEY = /^(part|time|tempo|humanize)\s*:/

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
    if (TAB_ROW.test(line)) {
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
): BlockHeader | null {
  const measureText = asString(header.measure)
  if (!measureText) {
    errors.push({
      severity: 'error',
      message: `Tab block ${blockNumber} missing 'measure:', skipping block.`,
      location: { block: blockNumber },
    })
    return null
  }
  const m = /^(\d+)\s*\*\s*(\d+(?:\.\d+)?)$/.exec(measureText)
  if (!m) {
    errors.push({
      severity: 'error',
      message: `Block ${blockNumber}: invalid measure spec "${measureText}", expected "M*N".`,
      location: { block: blockNumber },
    })
    return null
  }
  const subdivisions = Number(m[1])
  const pulses = Number(m[2])

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
    measure: { subdivisions, pulses },
    time,
    tempo: asNumber(header.tempo) ?? config.tempo,
    humanize: asHumanize(header.humanize) ?? config.humanize,
    part: asString(header.part),
  }
}

function computeBeatsPerMeasure(block: BlockHeader): number {
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

  const measures: Hit[][] = []
  for (let m = 0; m < measureTexts.length; m++) {
    const hits = parseMeasure(
      measureTexts[m],
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
      const slot = slots[p]
      if (slot === '-' || slot === ' ') continue
      const spec = resolveNoteSpec(
        slot,
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
      const note = resolveNote(spec, instrumentDef, errors, lineName)
      if (note === null) continue
      const velocity = resolveVelocity(spec, lineDef, instrumentDef)
      out.push({
        beat: beatPos,
        note,
        velocity,
        channel: DRUM_CHANNEL,
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
