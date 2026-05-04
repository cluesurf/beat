// Export a Song to a Standard MIDI File (.mid).
//
// Why: drag the result into Logic / Pro Tools / Reaper for
// permanent capture, share with collaborators, audition without
// running TS, ship a song to someone who has no Node installed.
//
// Format: SMF Type 0 — one track containing every note. Drum
// software opens these fine. Tempo is set via a meta event so
// the destination DAW reads the right BPM.
//
// Spec: https://midi.org/specifications/midi1-specifications
//
// Tick resolution: 480 ticks per quarter note ("PPQ"). Standard
// high-res value used by Logic / Cubase / Pro Tools.

import fs from 'node:fs'
import { dirname } from 'node:path'

import { expandSong, type Hit, type Song } from '../song'
import { humanize, type HumanizeConfig } from '../humanize'
import { DRUM_CHANNEL } from '../note'

const TICKS_PER_BEAT = 480

type MidiEvent = {
  tick: number
  bytes: number[]
}

export type ExportConfig = {
  outputPath: string
  // Optional: apply humanization before writing. If omitted, the
  // song's own `humanize` setting is used. Pass `null` to force
  // no humanization regardless of the song setting.
  humanize?: HumanizeConfig | null
}

export function exportSongToMidi(
  song: Song,
  config: ExportConfig,
): void {
  const raw = expandSong(song)
  const humanizeConfig =
    config.humanize === null
      ? undefined
      : config.humanize ?? song.humanize
  const hits = humanizeConfig ? humanize(raw, humanizeConfig) : raw

  const buffer = buildMidiFile(song, hits)
  fs.mkdirSync(dirname(config.outputPath), { recursive: true })
  fs.writeFileSync(config.outputPath, buffer)
}

// ---------------------------------------------------------------
// File construction
// ---------------------------------------------------------------

function buildMidiFile(song: Song, hits: Hit[]): Uint8Array {
  const ticksPerMs = (TICKS_PER_BEAT * song.bpm) / 60_000
  const events: MidiEvent[] = []

  // Meta: tempo (microseconds per quarter note).
  const microsPerBeat = Math.round(60_000_000 / song.bpm)
  events.push({
    tick: 0,
    bytes: [
      0xff,
      0x51,
      0x03,
      (microsPerBeat >> 16) & 0xff,
      (microsPerBeat >> 8) & 0xff,
      microsPerBeat & 0xff,
    ],
  })

  // Notes.
  for (const hit of hits) {
    const tick = Math.max(0, Math.round(hit.beat * TICKS_PER_BEAT))
    const channel = (hit.channel ?? DRUM_CHANNEL) & 0x0f
    const velocity = clamp(Math.round(hit.velocity ?? 100), 1, 127)
    const durationTicks = Math.max(
      1,
      Math.round((hit.durationMs ?? 120) * ticksPerMs),
    )
    const note = hit.note & 0x7f

    events.push({
      tick,
      bytes: [0x90 | channel, note, velocity],
    })
    events.push({
      tick: tick + durationTicks,
      bytes: [0x80 | channel, note, 0],
    })
  }

  // Sort: ascending tick, with note-off before note-on at the
  // same tick (so a re-trigger of the same note plays cleanly).
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick
    const aIsNoteOff = (a.bytes[0] & 0xf0) === 0x80
    const bIsNoteOff = (b.bytes[0] & 0xf0) === 0x80
    if (aIsNoteOff && !bIsNoteOff) return -1
    if (!aIsNoteOff && bIsNoteOff) return 1
    return 0
  })

  // Track chunk body: delta-time (VLQ) + event bytes, repeated.
  const trackBody: number[] = []
  let prevTick = 0
  for (const evt of events) {
    const delta = evt.tick - prevTick
    trackBody.push(...vlq(delta), ...evt.bytes)
    prevTick = evt.tick
  }
  // End-of-track meta event.
  trackBody.push(0x00, 0xff, 0x2f, 0x00)

  // Header chunk: "MThd", length=6, format=0, ntrks=1, division.
  const header = [
    ...ascii('MThd'),
    0,
    0,
    0,
    6,
    0,
    0, // format 0
    0,
    1, // 1 track
    (TICKS_PER_BEAT >> 8) & 0xff,
    TICKS_PER_BEAT & 0xff,
  ]

  // Track chunk: "MTrk", length, body.
  const len = trackBody.length
  const track = [
    ...ascii('MTrk'),
    (len >> 24) & 0xff,
    (len >> 16) & 0xff,
    (len >> 8) & 0xff,
    len & 0xff,
    ...trackBody,
  ]

  return new Uint8Array([...header, ...track])
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

// Variable-length quantity. 7 bits per byte; MSB set on every
// byte except the last. MIDI uses this for delta-times.
function vlq(n: number): number[] {
  if (n < 0) throw new Error(`Cannot VLQ-encode negative: ${n}`)
  if (n === 0) return [0]
  const bytes: number[] = []
  let v = n
  bytes.unshift(v & 0x7f)
  v >>>= 7
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80)
    v >>>= 7
  }
  return bytes
}

function ascii(s: string): number[] {
  return Array.from(s, c => c.charCodeAt(0))
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
