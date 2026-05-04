// `load(songPath)` — read a `.beat` file from `test/` and parse
// it into a Song. The thin wrapper that lets a `text.ts` file
// declare itself as just a pointer at a `.beat`:
//
//   // test/tool/grudge/text.ts
//   import { load } from '@/code/tab/load'
//   export default load('tool/grudge/text.beat')
//
// Errors from the parser are warned to the console; the partial
// Song is still returned so playback proceeds.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Song } from '../song'
import { parse } from './parser'

const HERE = dirname(fileURLToPath(import.meta.url))
const TEST_ROOT = resolve(HERE, '../../test')

export function load(songPath: string): Song {
  const fullPath = resolve(TEST_ROOT, songPath)
  const text = readFileSync(fullPath, 'utf8')
  const result = parse(text)
  for (const e of result.errors) {
    console.warn(`[tab ${e.severity}] ${songPath}: ${e.message}`)
  }
  return result.song
}
