import { describe, expect, it } from 'vitest'

import { expandSong, validateSong, type Song } from './song'
import { DRUM_CHANNEL } from './note'
import { DEFAULT_BUS, KIT_CHANNEL, BUS } from './route'

function song(partial: Partial<Song>): Song {
  return {
    name: 'test',
    bpm: 120,
    patterns: [],
    arrangement: [],
    ...partial,
  }
}

describe('expandSong — routing resolution', () => {
  it('defaults channel + port when unset', () => {
    const s = song({
      patterns: [{ name: 'a', beats: 4, hits: [{ beat: 0, note: 36 }] }],
      arrangement: [{ pattern: 'a' }],
    })
    const [hit] = expandSong(s)
    expect(hit.channel).toBe(DRUM_CHANNEL)
    expect(hit.port).toBe(DEFAULT_BUS)
  })

  it('hit channel/port win over song defaults', () => {
    const s = song({
      channel: 5,
      port: BUS.WORLD,
      patterns: [
        {
          name: 'a',
          beats: 4,
          hits: [
            { beat: 0, note: 36, channel: KIT_CHANNEL.KICK, port: BUS.KIT },
            { beat: 1, note: 38 }, // inherits song defaults
          ],
        },
      ],
      arrangement: [{ pattern: 'a' }],
    })
    const hits = expandSong(s)
    expect(hits[0].channel).toBe(KIT_CHANNEL.KICK)
    expect(hits[0].port).toBe(BUS.KIT)
    expect(hits[1].channel).toBe(5)
    expect(hits[1].port).toBe(BUS.WORLD)
  })

  it('expands repeats with absolute beats', () => {
    const s = song({
      patterns: [{ name: 'a', beats: 4, hits: [{ beat: 0, note: 36 }] }],
      arrangement: [{ pattern: 'a', repeat: 3 }],
    })
    const hits = expandSong(s)
    expect(hits.map(h => h.beat)).toEqual([0, 4, 8])
  })

  it('routes different pieces to different channels (per-piece rig)', () => {
    const s = song({
      patterns: [
        {
          name: 'a',
          beats: 4,
          hits: [
            { beat: 0, note: 36, channel: KIT_CHANNEL.KICK },
            { beat: 1, note: 38, channel: KIT_CHANNEL.SNARE },
          ],
        },
      ],
      arrangement: [{ pattern: 'a' }],
    })
    const hits = expandSong(s)
    expect(hits[0].channel).toBe(0)
    expect(hits[1].channel).toBe(1)
  })
})

describe('validateSong', () => {
  it('passes a clean song', () => {
    const s = song({
      patterns: [{ name: 'a', beats: 4, hits: [{ beat: 0, note: 36, velocity: 100 }] }],
      arrangement: [{ pattern: 'a' }],
    })
    expect(validateSong(s)).toEqual([])
  })

  it('flags unknown pattern references', () => {
    const s = song({
      patterns: [{ name: 'a', beats: 4, hits: [] }],
      arrangement: [{ pattern: 'nope' }],
    })
    const issues = validateSong(s)
    expect(issues.some(i => i.severity === 'error' && i.pattern === 'nope')).toBe(true)
  })

  it('warns on hits past the pattern length', () => {
    const s = song({
      patterns: [{ name: 'a', beats: 4, hits: [{ beat: 5, note: 36 }] }],
      arrangement: [{ pattern: 'a' }],
    })
    const issues = validateSong(s)
    expect(issues.some(i => i.severity === 'warning' && i.beat === 5)).toBe(true)
  })

  it('flags out-of-range note, velocity, channel', () => {
    const s = song({
      patterns: [
        {
          name: 'a',
          beats: 4,
          hits: [
            { beat: 0, note: 200 },
            { beat: 1, note: 36, velocity: 200 },
            { beat: 2, note: 36, channel: 99 },
          ],
        },
      ],
      arrangement: [{ pattern: 'a' }],
    })
    const issues = validateSong(s)
    expect(issues.some(i => /note 200/.test(i.message))).toBe(true)
    expect(issues.some(i => /velocity 200/.test(i.message))).toBe(true)
    expect(issues.some(i => /channel 99/.test(i.message))).toBe(true)
  })
})
