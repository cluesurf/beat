// Basic 4/4 — ASCII tab format. The same song lives in
// `code.ts` (DSL) and `data.ts` (JSON) for comparison.

import { parse } from '@/code/tab/index'

const TAB = `
instrument: drumkit
tempo: 100

measure: 4*4
H|x-x-:x-x-:x-x-:x-x-|
S|----:x---:----:x---|
K|x---:----:x---:----|
`

const { song, errors } = parse(TAB)
if (errors.length > 0) {
  for (const e of errors) {
    console.warn(`[tab] ${e.severity}: ${e.message}`)
  }
}
song.name = 'Basic 4/4 (text)'

export default song
