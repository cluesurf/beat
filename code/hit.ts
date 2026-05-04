// Send one drum hit. note-on now, note-off after the given
// duration. Drums don't really care about note-off (the sample
// plays to its tail) but Logic / SD3 still wants the pair so
// MIDI piano-roll display + recording work right.

import type easymidi from 'easymidi'
import { DRUM_CHANNEL } from './note'

export type DrumHit = {
  note: number
  velocity?: number
  durationMs?: number
  channel?: number
}

const DEFAULT_VELOCITY = 110
const DEFAULT_DURATION_MS = 120

export function sendHit(output: easymidi.Output, hit: DrumHit): void {
  const channel = (hit.channel ?? DRUM_CHANNEL) as easymidi.Channel
  const velocity = hit.velocity ?? DEFAULT_VELOCITY
  const durationMs = hit.durationMs ?? DEFAULT_DURATION_MS

  output.send('noteon', { note: hit.note, velocity, channel })

  setTimeout(() => {
    output.send('noteoff', { note: hit.note, velocity: 0, channel })
  }, durationMs)
}
