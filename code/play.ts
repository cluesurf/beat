// Load a song, expand its arrangement, send each hit at the
// right wall-clock time.
//
// Usage:
//   pnpm play                              # plays default song (lateralus)
//   pnpm play -- lateralus                 # explicit
//
// The song name maps to `beat/base/song/<name>/index.ts` and
// must `export default` a Song.

import { openDrumOutput } from './output'
import { sendHit } from './hit'
import { expandSong, type Song } from './song'

const songName = process.argv[2] ?? 'lateralus'

// Dynamic import so we resolve the path lazily — keeps the
// player module from depending on every song file at parse
// time.
const mod = (await import(`../base/song/${songName}/index.ts`)) as {
  default: Song
}
const song = mod.default

const output = openDrumOutput()
const hits = expandSong(song)
const msPerBeat = 60_000 / song.bpm
const totalMs = Math.max(...hits.map(h => h.beat)) * msPerBeat + 500

console.log(
  `[beat] playing "${song.name}" at ${song.bpm} BPM ` +
    `— ${hits.length} hits over ${(totalMs / 1000).toFixed(1)}s`,
)

for (const hit of hits) {
  setTimeout(() => sendHit(output, hit), hit.beat * msPerBeat)
}

setTimeout(() => {
  output.close()
  console.log('[beat] done')
}, totalMs)
