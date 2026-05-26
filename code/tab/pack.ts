// Instrument-pack registry. The `instrument:` front-matter key
// selects which pack a tab document uses. A pack bundles its
// instrument definitions (articulation → note maps + default
// route) and its default line names (the row labels).
//
// Add a pack: define `<NAME>_INSTRUMENTS` + `<NAME>_LINES` in a
// new `code/tab/<name>.ts`, then register it here.

import { DRUMKIT_INSTRUMENTS, DRUMKIT_LINES } from './drum'
import { WORLD_INSTRUMENTS, WORLD_LINES } from './world'
import { CINEMATIC_INSTRUMENTS, CINEMATIC_LINES } from './cinematic'
import { ELECTRONIC_INSTRUMENTS, ELECTRONIC_LINES } from './electronic'
import type { InstrumentDef, LineDef } from './types'

export type Pack = {
  instruments: Record<string, InstrumentDef>
  lines: Record<string, LineDef>
}

export const PACKS: Record<string, Pack> = {
  drumkit: { instruments: DRUMKIT_INSTRUMENTS, lines: DRUMKIT_LINES },
  world: { instruments: WORLD_INSTRUMENTS, lines: WORLD_LINES },
  cinematic: {
    instruments: CINEMATIC_INSTRUMENTS,
    lines: CINEMATIC_LINES,
  },
  electronic: {
    instruments: ELECTRONIC_INSTRUMENTS,
    lines: ELECTRONIC_LINES,
  },
}

export const DEFAULT_PACK = 'drumkit'

// Resolve a pack by name, falling back to drumkit. Returns the
// pack plus whether the name was recognized (so the parser can
// emit a helpful error on a typo).
export function resolvePack(name: string): {
  pack: Pack
  known: boolean
} {
  const pack = PACKS[name]
  if (pack) return { pack, known: true }
  return { pack: PACKS[DEFAULT_PACK]!, known: false }
}
