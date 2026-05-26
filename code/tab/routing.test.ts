import { describe, it, expect } from 'vitest'

import { parse } from './index'
import { NOTE } from '../note'
import { KIT_CHANNEL, WORLD_CHANNEL, BUS } from '../route'

describe('drumkit per-piece channel routing', () => {
  it('routes each kit piece to its own channel by default', () => {
    const r = parse(`
measure: 4*4
K|x---:----:----:----|
S|----:x---:----:----|
H|x---:----:----:----|
R|----:----:x---:----|
`)
    expect(r.errors).toEqual([])
    const ch = (note: number) =>
      r.hits.find(h => h.note === note)?.channel
    expect(ch(NOTE.kick)).toBe(KIT_CHANNEL.KICK)
    expect(ch(NOTE.snare)).toBe(KIT_CHANNEL.SNARE)
    expect(ch(NOTE.closedHat)).toBe(KIT_CHANNEL.HI_HAT)
    expect(ch(NOTE.rideTip)).toBe(KIT_CHANNEL.RIDE)
  })

  it('lets front matter override a line channel', () => {
    const r = parse(`
K:
  channel: 7

measure: 4*4
K|x---:----:----:----|
`)
    expect(r.errors).toEqual([])
    expect(r.hits[0].channel).toBe(7)
  })
})

describe('instrument packs', () => {
  it('resolves the world pack and routes to its bus + channel', () => {
    const r = parse(`
instrument: world
measure: 4*4
Tb|x---:----:----:----|
Co|----:x---:----:----|
`)
    expect(r.errors).toEqual([])
    const tabla = r.hits.find(h => h.channel === WORLD_CHANNEL.TABLA)
    const congas = r.hits.find(h => h.channel === WORLD_CHANNEL.CONGAS)
    expect(tabla?.port).toBe(BUS.WORLD)
    expect(congas?.port).toBe(BUS.WORLD)
  })

  it('errors on an unknown pack and falls back to drumkit', () => {
    const r = parse(`
instrument: nonsense
measure: 4*4
K|x---:----:----:----|
`)
    expect(r.errors.some(e => /unknown instrument pack/i.test(e.message))).toBe(
      true,
    )
    // drumkit fallback still routes the kick correctly
    expect(r.hits[0]?.channel).toBe(KIT_CHANNEL.KICK)
  })
})
