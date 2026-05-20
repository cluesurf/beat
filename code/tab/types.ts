// Shared types for the tab document parser.

import type { Hit, Song } from '../song'
import type { HumanizeConfig } from '../humanize'

export type Velocity = number | [number, number]

export type NoteSpec = {
  velocity?: Velocity
  // Articulation name — looked up in the line's instrument
  // articulation map to produce a MIDI note.
  hit?: string
  // Direct MIDI note number override. Bypasses `hit:` lookup.
  note?: number
  // Add a flam grace note this many beats before the main hit.
  flam?: number
}

export type ArticulationMap = Record<string, number>

export type InstrumentDef = {
  name: string
  articulations: ArticulationMap
  defaultArticulation: string
  defaultVelocity: Velocity
  notes: Record<string, NoteSpec>
}

export type LineDef = {
  instrument: string
  velocity?: Velocity
  humanize?: HumanizeConfig
  notes: Record<string, NoteSpec>
}

export type BlockHeader = {
  // Grid resolution + pulses per measure. Populated from either
  // `flow: A:B` (preferred) where A=segments, B=slots-per-segment,
  // or legacy `measure: M*N` where M=subdivisions, N=pulses.
  // Internally we keep subdivisions=B, pulses=A so the rest of
  // the parser stays the same.
  measure: { subdivisions: number; pulses: number }
  // Maps slots → BPM beats. Populated from `rate: X:Y` (preferred)
  // where X=slots, Y=beats. If omitted, derived from legacy
  // `time: N/D` or defaults so that 1 pulse = 1 quarter note.
  rate?: { slots: number; beats: number }
  // Legacy time signature; pulse = a 4/denominator note.
  // Default {numerator: pulses, denominator: 4} → quarter pulses.
  // Kept for backward compatibility with `time: N/D`.
  time?: { numerator: number; denominator: number }
  tempo?: number
  humanize?: HumanizeConfig
  // Section name (e.g., "intro", "bridge-2"). Inherits from the
  // previous block when omitted. Used to name patterns and group
  // bars in the bar log.
  part?: string
}

export type DocumentConfig = {
  instrument: string
  tempo: number
  humanize?: HumanizeConfig
  lines: Record<string, LineDef>
  globalNotes: Record<string, NoteSpec>
}

// One issue noticed during parsing. The parser keeps going and
// reports every issue at the end so authors see all problems
// in one pass instead of fix-rerun-fix-rerun.
export type ParseError = {
  message: string
  // Severity. `error` = something was skipped or fell back to a
  // default. `warning` = parser kept the value but flags an
  // ambiguity worth knowing about.
  severity: 'error' | 'warning'
  // 1-indexed line number in the original source, when known.
  line?: number
  // Where in the document. Useful for "at row K, measure 3, beat 2, position 5".
  location?: {
    block?: number
    row?: string
    measure?: number
    beat?: number
    position?: number
  }
}

export type ParseResult = {
  config: DocumentConfig
  song: Song
  hits: Hit[]
  // Empty array on a clean parse. Otherwise lists everything
  // that went wrong, with the song still containing what was
  // successfully parsed.
  errors: ParseError[]
}
