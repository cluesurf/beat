// Walk a song's arrangement and emit one BarInfo per played bar.
// Used by play.ts to map between bar numbers ("bar 7 of 16") and
// absolute beat positions.

import type { Song } from './song'

export type BarInfo = {
  // 1-indexed bar number across the whole song.
  totalBar: number
  // Index into song.arrangement of the section this bar belongs to.
  sectionIndex: number
  // The Pattern name this bar plays.
  patternName: string
  // 1-indexed repeat count within the section (e.g. 3rd of 4 verses).
  barInSection: number
  // Absolute beat position where this bar starts (0 = song start).
  startBeat: number
  // Length of this bar in beats.
  beats: number
}

export function expandArrangement(song: Song): BarInfo[] {
  const byName = new Map(song.patterns.map(p => [p.name, p]))
  const out: BarInfo[] = []
  let cursor = 0
  let totalBar = 0

  for (let s = 0; s < song.arrangement.length; s++) {
    const section = song.arrangement[s]
    const pattern = byName.get(section.pattern)
    if (!pattern) {
      throw new Error(
        `Song "${song.name}" arrangement references unknown pattern "${section.pattern}".`,
      )
    }
    const repeat = section.repeat ?? 1
    for (let r = 0; r < repeat; r++) {
      totalBar++
      out.push({
        totalBar,
        sectionIndex: s,
        patternName: section.pattern,
        barInSection: r + 1,
        startBeat: cursor,
        beats: pattern.beats,
      })
      cursor += pattern.beats
    }
  }

  return out
}
