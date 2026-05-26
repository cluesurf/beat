// Electronic / hybrid pack — `instrument: electronic`.
//
// Routes to the ELECTRONIC IAC bus, one channel per instrument
// (ELECTRONIC_CHANNEL). Hosts Battery 4, Microtonic, samplers,
// sub-bass layers, the Vicarious pulse, glitch textures.
//
// ⚠️ NOTE NUMBERS ARE PROVISIONAL — remap to your actual plugin
// (Battery 4 cells / Microtonic channels) per-song in front
// matter or here. The routing (channel + bus) is correct.

import { ELECTRONIC_CHANNEL, BUS } from '../route'
import type { InstrumentDef, LineDef } from './types'

function cell(name: string, channel: number, note: number): InstrumentDef {
  return {
    name,
    channel,
    port: BUS.ELECTRONIC,
    articulations: { main: note },
    defaultArticulation: 'main',
    defaultVelocity: 110,
    notes: {
      x: { hit: 'main' },
      X: { hit: 'main', velocity: 127 },
      o: { hit: 'main' },
      g: { hit: 'main', velocity: 40 },
      d: { hit: 'main', velocity: 70 },
    },
  }
}

export const ELECTRONIC_INSTRUMENTS: Record<string, InstrumentDef> = {
  'sub-kick': cell('sub-kick', ELECTRONIC_CHANNEL.SUB_KICK, 36),
  'industrial-snare': cell(
    'industrial-snare',
    ELECTRONIC_CHANNEL.INDUSTRIAL_SNARE,
    38,
  ),
  'glitch-hihat': cell('glitch-hihat', ELECTRONIC_CHANNEL.GLITCH_HI_HAT, 42),
  'vicarious-pulse': cell(
    'vicarious-pulse',
    ELECTRONIC_CHANNEL.VICARIOUS_PULSE,
    48,
  ),
  'pad-drone': cell('pad-drone', ELECTRONIC_CHANNEL.PAD_DRONE, 50),
  granular: cell('granular', ELECTRONIC_CHANNEL.GRANULAR, 52),
}

function line(instrument: string): LineDef {
  return { instrument, notes: {} }
}

export const ELECTRONIC_LINES: Record<string, LineDef> = {
  Sk: line('sub-kick'),
  Is: line('industrial-snare'),
  Gh: line('glitch-hihat'),
  Vp: line('vicarious-pulse'),
  Pd: line('pad-drone'),
  Gr: line('granular'),
}
