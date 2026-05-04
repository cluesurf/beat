#!/usr/bin/env node
//
// Standalone runner: `beat <path/to/file.beat>`
//
// - Loads the file via the tab parser
// - Plays it on loop forever (Ctrl-C to stop)
// - Watches the file; on save, finishes the current loop and
//   re-reads + re-parses + plays the latest version
// - Adjacent to `pnpm play <name>` (folder-based) — this one is
//   path-based and meant to be run as a top-level command after
//   `pnpm link --global` or via the `beat` bin in package.json.
//
// Flags:
//   --once             play once and exit (no loop, no watch)
//   --restart          cut current loop on save instead of finishing it
//   --humanize <preset>  apply timing+velocity jitter
//   --seed <n>         reproducible humanize seed

import { existsSync, readFileSync, watch } from 'node:fs'
import { relative, resolve } from 'node:path'
import easymidi from 'easymidi'
import { debounce } from 'lodash-es'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { openDrumOutput } from '@/code/output'
import { sendHit } from '@/code/hit'
import { expandSong, type Hit, type Song } from '@/code/song'
import { DRUM_CHANNEL } from '@/code/note'
import { humanize, HUMANIZE, type HumanizePreset } from '@/code/humanize'
import { parse as parseTab } from '@/code/tab/index'

// ---------------------------------------------------------------
// Args
// ---------------------------------------------------------------

const argv = await yargs(hideBin(process.argv))
  .scriptName('beat')
  .usage('Usage: $0 <path> [options]\n\nPlay a .beat file on loop, hot-reload on save')
  .demandCommand(1, 'Pass the path to a .beat file')
  .option('once', {
    type: 'boolean',
    default: false,
    describe: 'Play once and exit (no loop, no watch)',
  })
  .option('restart', {
    type: 'boolean',
    default: false,
    describe: 'Cut current loop on save instead of finishing it',
  })
  .option('humanize', {
    type: 'string',
    choices: Object.keys(HUMANIZE),
    describe: 'Apply timing+velocity jitter',
  })
  .option('seed', {
    type: 'number',
    describe: 'Reproducible humanize seed',
  })
  .help()
  .parseAsync()

const filePath = resolve(process.cwd(), String(argv._[0]))
const shortPath = relative(process.cwd(), filePath) || filePath
if (!existsSync(filePath)) {
  console.error(`[beat] file not found: ${shortPath}`)
  process.exit(1)
}
if (!filePath.endsWith('.beat')) {
  console.warn(`[beat] warning: ${shortPath} does not end in .beat`)
}

const watchMode = !argv.once
const restartImmediately = Boolean(argv.restart)
const humanizeName = argv.humanize as string | undefined
const seed = argv.seed as number | undefined

// ---------------------------------------------------------------
// Load + parse
// ---------------------------------------------------------------

function loadSong(): Song {
  const text = readFileSync(filePath, 'utf8')
  const result = parseTab(text)
  for (const e of result.errors) {
    console.warn(`[beat] tab ${e.severity}: ${e.message}`)
  }
  return result.song
}

// ---------------------------------------------------------------
// Playback state
// ---------------------------------------------------------------

const output = openDrumOutput()
let timers: NodeJS.Timeout[] = []
const sounding = new Set<number>()

function patchedSendHit(hit: Hit): void {
  sounding.add(hit.note)
  sendHit(output, hit)
  setTimeout(() => sounding.delete(hit.note), (hit.durationMs ?? 120) + 50)
}

function stop(): void {
  for (const t of timers) clearTimeout(t)
  timers = []
  for (let ch = 0; ch < 16; ch++) {
    output.send('cc', {
      controller: 123,
      value: 0,
      channel: ch as easymidi.Channel,
    })
  }
  for (const note of sounding) {
    output.send('noteoff', {
      note,
      velocity: 0,
      channel: DRUM_CHANNEL as easymidi.Channel,
    })
  }
  sounding.clear()
}

function schedulePass(song: Song): Promise<void> {
  const raw = expandSong(song)
  const humanizeConfig =
    humanizeName !== undefined
      ? HUMANIZE[humanizeName as HumanizePreset]
      : song.humanize
  const hits = humanizeConfig
    ? humanize(raw, { ...humanizeConfig, seed: seed ?? humanizeConfig.seed })
    : raw

  const msPerBeat = 60_000 / song.bpm
  const lastBeat = Math.max(0, ...hits.map(h => h.beat))
  const totalMs = lastBeat * msPerBeat + 500

  console.log(
    `[beat] playing "${song.name}" @ ${song.bpm} BPM — ` +
      `${hits.length} hits, ${(totalMs / 1000).toFixed(1)}s` +
      (humanizeName ? ` [humanize: ${humanizeName}]` : ''),
  )

  for (const hit of hits) {
    const delay = Math.max(0, hit.beat * msPerBeat)
    timers.push(setTimeout(() => patchedSendHit(hit), delay))
  }

  return new Promise(done => {
    timers.push(setTimeout(() => done(), totalMs))
  })
}

// ---------------------------------------------------------------
// Main loop + watcher
// ---------------------------------------------------------------

let dirty = false

const onChange = debounce((filename: string | null) => {
  console.log(`[beat] changed: ${filename ?? '(unknown)'}`)
  dirty = true
  if (restartImmediately) stop()
}, 100)

if (watchMode) {
  watch(filePath, (_event, filename) => {
    onChange(filename ? String(filename) : null)
  })
  console.log(
    `[beat] watching ${shortPath} ` +
      `(${restartImmediately ? 'cut + restart' : 'finish loop, then reload'})`,
  )
}

process.on('SIGINT', () => {
  console.log('\n[beat] stopping')
  stop()
  output.close()
  process.exit(0)
})

let song = loadSong()
while (true) {
  if (dirty) {
    dirty = false
    try {
      song = loadSong()
      console.log(`[beat] reloaded`)
    } catch (err) {
      console.error('[beat] reload failed:', err)
    }
  }
  await schedulePass(song)
  if (!watchMode) break
}

stop()
output.close()
