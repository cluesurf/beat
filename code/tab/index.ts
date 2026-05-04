// Tab parser. Single entry point: `parse(text)`.
//
// Type imports for the result shape live alongside.

export { parse } from './parser'
export { load } from './load'
export type {
  ArticulationMap,
  BlockHeader,
  DocumentConfig,
  InstrumentDef,
  LineDef,
  NoteSpec,
  ParseError,
  ParseResult,
  Velocity,
} from './types'
