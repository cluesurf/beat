// Load a song, expand its arrangement, send each hit at the
// right wall-clock time. Loops by default. Watches the song
// directory and hot-reloads on save — edit files while playing
// and the next loop picks up your changes (or, with `--restart`,
// restarts immediately from beat 0).
//
// Usage:
//   pnpm play                            # plays default song (example), loops + watches
//   pnpm play example                    # explicit
//   pnpm play example --once             # play once and exit
//   pnpm play example --restart          # cut current loop on save instead of finishing
//   pnpm play example --pattern verse    # loop ONE pattern (solo). watches too.
//
// The song name maps to `beat/base/song/<name>/index.ts`.

import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { watch } from 'node:fs'
import easymidi from 'easymidi'

import { openDrumOutput } from './output'
import { sendHit } from './hit'
import { expandSong, type Hit, type Song } from './song'
import { DRUM_CHANNEL } from './note'

// --- args -----------------------------------------------------

const positional = process.argv.slice(2).filter(a => !a.startsWith('--'))
const flagArgs = process.argv.slice(2)

const songName = positional[0] ?? 'example'
const watchMode = !flagArgs.includes('--once')
const restartImmediately = flagArgs.includes('--restart')

// `--pattern <name>` solos one pattern of the song, looped
// forever. Useful when you want to iterate on a single section
// without waiting for the rest of the arrangement.
const patternFlagIdx = flagArgs.indexOf('--pattern')
const soloPattern: string | null =
  patternFlagIdx >= 0 ? (flagArgs[patternFlagIdx + 1] ?? null) : null

// --- song loader (cache-busted) -------------------------------

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const songDir = resolve(__dirname, `../base/song/${songName}`)
const songPath = resolve(songDir, 'index.ts')

// ESM caches imports by URL. Append a query string so each
// re-import sees a "different" URL and re-parses the file.
//
// NOTE: this cache-busts the index.ts module only. Static
// imports inside index.ts (e.g. `import verse from './verse'`)
// stay cached. To pick up changes in sibling files, either
// (a) use dynamic imports in index.ts:
//     const verse = (await import(`./verse?t=${Date.now()}`)).default
// or (b) restart `pnpm play` after editing the sibling.
async function loadSong(): Promise<Song> {
  const url = pathToFileURL(songPath).href + `?t=${Date.now()}`
  const mod = (await import(url)) as { default: Song }
  let song = mod.default
  if (soloPattern) {
    const p = song.patterns.find(p => p.name === soloPattern)
    if (!p) {
      throw new Error(
        `--pattern "${soloPattern}" not found in "${song.name}". ` +
          `Available: ${song.patterns.map(p => p.name).join(', ')}`,
      )
    }
    // Replace the arrangement so only the solo pattern plays.
    // The outer `while(true)` loop in run() handles repeat.
    song = { ...song, arrangement: [{ pattern: soloPattern }] }
  }
  return song
}

// --- live playback state --------------------------------------

const output = openDrumOutput()
let timers: NodeJS.Timeout[] = []
const sounding = new Set<number>()

function patchedSendHit(hit: Hit): void {
  sounding.add(hit.note)
  sendHit(output, hit)
  setTimeout(() => sounding.delete(hit.note), (hit.durationMs ?? 120) + 50)
}

// Cancel timers + force-silence anything still sounding. Sends
// All-Notes-Off CC + per-note note-off on every channel as
// belt + suspenders since some VSTs ignore one or the other.
function stop(): void {
  for (const t of timers) clearTimeout(t)
  timers = []
  for (let ch = 0; ch < 16; ch++) {
    output.send('cc', { controller: 123, value: 0, channel: ch as easymidi.Channel })
  }
  for (const note of sounding) {
    output.send('noteoff', { note, velocity: 0, channel: DRUM_CHANNEL as easymidi.Channel })
  }
  sounding.clear()
}

function schedulePass(song: Song): Promise<void> {
  const hits = expandSong(song)
  const msPerBeat = 60_000 / song.bpm
  const lastBeat = Math.max(0, ...hits.map(h => h.beat))
  const totalMs = lastBeat * msPerBeat + 500

  const tag = soloPattern ? `${song.name} [solo: ${soloPattern}]` : song.name
  console.log(
    `[beat] playing "${tag}" @ ${song.bpm} BPM — ` +
      `${hits.length} hits over ${(totalMs / 1000).toFixed(1)}s`,
  )

  for (const hit of hits) {
    timers.push(setTimeout(() => patchedSendHit(hit), hit.beat * msPerBeat))
  }

  return new Promise(resolveOuter => {
    timers.push(setTimeout(() => resolveOuter(), totalMs))
  })
}

// --- main loop + watch ----------------------------------------

let dirty = false

async function run(): Promise<void> {
  let song = await loadSong()

  while (true) {
    if (dirty) {
      dirty = false
      try {
        song = await loadSong()
        console.log(`[beat] reloaded "${songName}"`)
      } catch (err) {
        console.error(`[beat] reload failed:`, err)
      }
    }
    await schedulePass(song)
    if (!watchMode) break
  }
}

// Watch the WHOLE song directory (recursive) so sibling files
// — verse.ts, chorus.ts, etc. — also trigger reload. fs.watch
// fires multiple times per save, so debounce.
function startWatcher() {
  let debounce: NodeJS.Timeout | null = null
  watch(songDir, { recursive: true }, (_event, filename) => {
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => {
      console.log(`[beat] changed: ${filename ?? '(unknown)'}`)
      dirty = true
      if (restartImmediately) stop()
    }, 100)
  })
  console.log(
    `[beat] watching ${songDir} ` +
      `(${restartImmediately ? 'cut + restart' : 'finish loop, then reload'})`,
  )
}

if (watchMode) startWatcher()

process.on('SIGINT', () => {
  console.log('\n[beat] stopping')
  stop()
  output.close()
  process.exit(0)
})

run().catch(err => {
  console.error(err)
  stop()
  output.close()
  process.exit(1)
})
