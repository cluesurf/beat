// Public surface of @cluesurf/beat for library users.
//
//   import { parse, play } from '@cluesurf/beat'
//
//   const beat = parse(readFileSync('./calm.beat', 'utf8'))
//   const stop = play(beat.song, { loop: true })
//   await stop()

export { parse } from './tab/parser'
export { load } from './tab/load'
export { play, type PlayOptions, type Stop } from './playback'

// Humanization
export { humanize, HUMANIZE, type HumanizeConfig, type HumanizePreset } from './humanize'

// Song / Hit / Pattern types and helpers
export {
  expandSong,
  type Hit,
  type Pattern,
  type Section,
  type Song,
} from './song'
export { expandArrangement, type BarInfo } from './arrangement'

// Drum constants
export { NOTE, DRUM_CHANNEL } from './note'

// Tab parser internals (advanced)
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
} from './tab/index'
export { DRUMKIT_INSTRUMENTS, DRUMKIT_LINES } from './tab/drum'

// MIDI export
export { exportSongToMidi, type ExportConfig } from './export/midi'
