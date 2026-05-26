// Cinematic / tribal ensemble pack — `instrument: cinematic`.
//
// Routes to the CINEMATIC IAC bus, one channel per instrument
// (CINEMATIC_CHANNEL). Hosts Damage 2, Spitfire HZ01, Soundiron
// (Tibetan bowls / crotales / mark tree / gongs), tuned metals.
//
// ⚠️ NOTE NUMBERS ARE PROVISIONAL — remap to your actual plugin
// (Damage 2 / HZ01 / Soundiron) per-song in front matter or by
// editing this file. The routing (channel + bus) is correct.

import { CINEMATIC_CHANNEL, BUS } from '../route'
import type { InstrumentDef, LineDef } from './types'

function hit(name: string, channel: number, note: number): InstrumentDef {
  return {
    name,
    channel,
    port: BUS.CINEMATIC,
    articulations: { main: note },
    defaultArticulation: 'main',
    defaultVelocity: 100,
    notes: {
      x: { hit: 'main' },
      X: { hit: 'main', velocity: 120 },
      O: { hit: 'main', velocity: 127 },
      g: { hit: 'main', velocity: 40 },
      d: { hit: 'main', velocity: 70 },
      f: { hit: 'main', velocity: 110, flam: 0.05 },
    },
  }
}

export const CINEMATIC_INSTRUMENTS: Record<string, InstrumentDef> = {
  taiko: hit('taiko', CINEMATIC_CHANNEL.TAIKO, 48),
  surdo: hit('surdo', CINEMATIC_CHANNEL.SURDO, 49),
  'damage-tribal': hit('damage-tribal', CINEMATIC_CHANNEL.DAMAGE_TRIBAL, 50),
  'damage-impacts': hit('damage-impacts', CINEMATIC_CHANNEL.DAMAGE_IMPACTS, 51),
  'tibetan-bowls': hit('tibetan-bowls', CINEMATIC_CHANNEL.TIBETAN_BOWLS, 52),
  crotales: hit('crotales', CINEMATIC_CHANNEL.CROTALES, 53),
  'mark-tree': hit('mark-tree', CINEMATIC_CHANNEL.MARK_TREE, 54),
  gongs: hit('gongs', CINEMATIC_CHANNEL.GONGS, 55),
  'tam-tam': hit('tam-tam', CINEMATIC_CHANNEL.TAM_TAM, 56),
  'bell-tree': hit('bell-tree', CINEMATIC_CHANNEL.BELL_TREE, 57),
  'tubular-bells': hit('tubular-bells', CINEMATIC_CHANNEL.TUBULAR_BELLS, 58),
  glockenspiel: hit('glockenspiel', CINEMATIC_CHANNEL.GLOCKENSPIEL, 59),
  marimba: hit('marimba', CINEMATIC_CHANNEL.MARIMBA, 60),
  vibraphone: hit('vibraphone', CINEMATIC_CHANNEL.VIBRAPHONE, 61),
}

function line(instrument: string): LineDef {
  return { instrument, notes: {} }
}

export const CINEMATIC_LINES: Record<string, LineDef> = {
  Tk: line('taiko'),
  Su: line('surdo'),
  Dt: line('damage-tribal'),
  Di: line('damage-impacts'),
  Bw: line('tibetan-bowls'),
  Cr: line('crotales'),
  Mt: line('mark-tree'),
  Go: line('gongs'),
  Tm: line('tam-tam'),
  Bt: line('bell-tree'),
  Tu: line('tubular-bells'),
  Gl: line('glockenspiel'),
  Ma: line('marimba'),
  Vi: line('vibraphone'),
}
