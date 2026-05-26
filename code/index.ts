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
  validateSong,
  type Hit,
  type Pattern,
  type Section,
  type Song,
  type SongIssue,
} from './song'
export { expandArrangement, type BarInfo } from './arrangement'

// Drum constants
export { NOTE, DRUM_CHANNEL } from './note'

// Routing: ports (IAC buses) + per-family channel maps
export {
  BUS,
  DEFAULT_BUS,
  KIT_CHANNEL,
  WORLD_CHANNEL,
  CINEMATIC_CHANNEL,
  ELECTRONIC_CHANNEL,
  type Bus,
  type Route,
} from './route'
export { MidiRouter, openDrumOutput } from './output'

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

// Instrument packs (drumkit / world / cinematic / electronic)
export { PACKS, DEFAULT_PACK, resolvePack, type Pack } from './tab/pack'

// MIDI export
export { exportSongToMidi, type ExportConfig } from './export/midi'
