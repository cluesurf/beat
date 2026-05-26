// World / ethnic percussion pack — `instrument: world`.
//
// Routes to the WORLD IAC bus, one channel per instrument
// (WORLD_CHANNEL). Hosts EastWest RA / Kontakt ethnic
// percussion, etc.
//
// ⚠️ NOTE NUMBERS ARE PROVISIONAL. The articulation→note maps
// below use General-MIDI percussion notes where they exist
// (bongos/congas/timbales) and placeholder notes otherwise
// (tabla/doumbek/frame drum — not in GM). **Remap to your
// actual plugin** either by editing this file or per-song in
// front matter:
//
//   Tb:
//     na: { note: 62 }    # your plugin's tabla "na" note
//
// The routing (channel + bus) is correct; only the notes need
// confirming against your sampler.

import { WORLD_CHANNEL, BUS } from '../route'
import type { InstrumentDef, LineDef } from './types'

// Simple single-zone percussion: one "main" articulation with
// the usual x/X/o/g/d/f velocity glyphs. `note` is provisional.
function perc(name: string, channel: number, note: number): InstrumentDef {
  return {
    name,
    channel,
    port: BUS.WORLD,
    articulations: { main: note },
    defaultArticulation: 'main',
    defaultVelocity: 95,
    notes: {
      x: { hit: 'main' },
      X: { hit: 'main', velocity: 118 },
      o: { hit: 'main' },
      g: { hit: 'main', velocity: 30 },
      d: { hit: 'main', velocity: 60 },
      f: { hit: 'main', velocity: 105, flam: 0.04 },
    },
  }
}

export const WORLD_INSTRUMENTS: Record<string, InstrumentDef> = {
  // Tabla — multi-articulation (the core bols). Provisional notes.
  tabla: {
    name: 'tabla',
    channel: WORLD_CHANNEL.TABLA,
    port: BUS.WORLD,
    articulations: {
      na: 60, // rim/edge (provisional)
      tin: 61,
      ge: 62, // bass (bayan) open
      ke: 63, // bass closed
      dha: 64, // na + ge together
      tun: 65,
    },
    defaultArticulation: 'na',
    defaultVelocity: 90,
    notes: {
      x: { hit: 'na' },
      n: { hit: 'na' },
      t: { hit: 'tin' },
      g: { hit: 'ge', velocity: 100 },
      k: { hit: 'ke', velocity: 70 },
      D: { hit: 'dha', velocity: 110 },
      u: { hit: 'tun' },
    },
  },

  doumbek: {
    name: 'doumbek',
    channel: WORLD_CHANNEL.DOUMBEK,
    port: BUS.WORLD,
    articulations: { doum: 66, tek: 67, ka: 68, slap: 69 },
    defaultArticulation: 'doum',
    defaultVelocity: 95,
    notes: {
      x: { hit: 'doum' },
      D: { hit: 'doum', velocity: 115 },
      t: { hit: 'tek' },
      k: { hit: 'ka', velocity: 70 },
      s: { hit: 'slap', velocity: 105 },
    },
  },

  'frame-drum': perc('frame-drum', WORLD_CHANNEL.FRAME_DRUM, 70),
  pakhawaj: perc('pakhawaj', WORLD_CHANNEL.PAKHAWAJ, 71),
  mridangam: perc('mridangam', WORLD_CHANNEL.MRIDANGAM, 72),
  riq: perc('riq', WORLD_CHANNEL.RIQ, 73),
  djembe: perc('djembe', WORLD_CHANNEL.DJEMBE, 74),
  cajon: perc('cajon', WORLD_CHANNEL.CAJON, 75),
  udu: perc('udu', WORLD_CHANNEL.UDU, 76),
  // GM-standard Latin percussion notes:
  shakers: perc('shakers', WORLD_CHANNEL.SHAKERS, 70), // GM maracas
  bongos: perc('bongos', WORLD_CHANNEL.BONGOS, 60), // GM hi bongo
  congas: perc('congas', WORLD_CHANNEL.CONGAS, 63), // GM open hi conga
  timbales: perc('timbales', WORLD_CHANNEL.TIMBALES, 65), // GM hi timbale
  berimbau: perc('berimbau', WORLD_CHANNEL.BERIMBAU, 77),
  'misc-perc': perc('misc-perc', WORLD_CHANNEL.MISC_PERC, 78),
}

function line(instrument: string): LineDef {
  return { instrument, notes: {} }
}

export const WORLD_LINES: Record<string, LineDef> = {
  Tb: line('tabla'),
  Pk: line('pakhawaj'),
  Mr: line('mridangam'),
  Dk: line('doumbek'),
  Fr: line('frame-drum'),
  Rq: line('riq'),
  Dj: line('djembe'),
  Cj: line('cajon'),
  Ud: line('udu'),
  Sh: line('shakers'),
  Bo: line('bongos'),
  Co: line('congas'),
  Ti: line('timbales'),
  Be: line('berimbau'),
  Mp: line('misc-perc'),
}
