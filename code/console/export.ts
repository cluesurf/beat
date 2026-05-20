// Export a song to a .mid file.
//
//   pnpm cli export                              # default song, one shot
//   pnpm cli export tool/grudge                  # specific song
//   pnpm cli export tool/grudge --output ~/Desktop/grudge.mid
//   pnpm cli export tool/grudge --humanize off   # bare grid
//   pnpm cli export tool/grudge --humanize loose --seed 42
//   pnpm cli export tool/grudge --watch          # re-export on every save
//
// Watch mode pairs with Logic's "Re-import MIDI" — drop the .mid
// onto a track once, and every time you save the .beat the file
// is rewritten in place. Beats Logic's MIDI clock / Link sync
// for tightness because Logic owns the playback timeline.

import { existsSync, readFileSync, watch } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { debounce } from 'lodash-es'
import type { Argv, CommandModule } from 'yargs'

import { exportSongToMidi } from '@/code/export/midi'
import {
  HUMANIZE,
  type HumanizeConfig,
  type HumanizePreset,
} from '@/code/humanize'
import type { Song } from '@/code/song'
import { parse as parseTab } from '@/code/tab/index'

type Args = {
  song: string
  output?: string
  humanize?: string
  seed?: number
  watch: boolean
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// First match wins. .beat is preferred because it's the editable
// source format; the TS variants are kept for legacy songs.
const SONG_FILES = ['text.beat', 'index.ts', 'text.ts', 'code.ts', 'data.ts']

export const exportCommand: CommandModule<unknown, Args> = {
  command: 'export [song]',
  describe: 'Export a song to a Standard MIDI File (.mid)',
  builder: (y: Argv): Argv<Args> =>
    y
      .positional('song', {
        type: 'string',
        default: 'example',
        describe: 'Song folder name under test/',
      })
      .option('output', {
        type: 'string',
        describe: 'Output path (default: out/<song>.mid)',
      })
      .option('humanize', {
        type: 'string',
        choices: Object.keys(HUMANIZE),
        describe: 'Apply humanize preset before exporting',
      })
      .option('seed', {
        type: 'number',
        describe: 'Reproducible humanization seed',
      })
      .option('watch', {
        type: 'boolean',
        default: false,
        describe:
          'Re-export on every save of the source song file. Drop the .mid into Logic once; saves rewrite it in place.',
      }) as Argv<Args>,
  handler: async args => {
    const songDir = resolve(__dirname, `../../test/${args.song}`)
    const songPath = SONG_FILES.map(f => resolve(songDir, f)).find(p =>
      existsSync(p),
    )
    if (!songPath) {
      throw new Error(
        `No song file found in ${songDir} ` +
          `(looked for: ${SONG_FILES.join(', ')})`,
      )
    }

    const outputPath = resolve(
      __dirname,
      '../..',
      args.output ?? `out/${args.song.replace(/\//g, '-')}.mid`,
    )

    async function exportOnce(): Promise<void> {
      const song = await loadSong(songPath!)
      const humanizeConfig = resolveHumanize(song, args)
      exportSongToMidi(song, { outputPath, humanize: humanizeConfig })
      const stamp = new Date().toLocaleTimeString()
      console.log(`[beat] ${stamp}  wrote ${outputPath}`)
    }

    await exportOnce()

    if (!args.watch) return

    const songDirShort = relative(process.cwd(), songDir) || songDir
    console.log(`[beat] watching ${songDirShort} — ctrl-c to stop`)

    // Debounce because editors often fire several change events
    // in quick succession on save (atomic-write pattern).
    const onChange = debounce(async (filename: string | null) => {
      try {
        await exportOnce()
      } catch (err) {
        console.error(
          `[beat] re-export failed (${filename ?? 'unknown'}):`,
          err instanceof Error ? err.message : err,
        )
      }
    }, 100)

    watch(songDir, { recursive: true }, (_event, filename) => {
      onChange(filename ? String(filename) : null)
    })

    // Park forever. SIGINT exits cleanly.
    await new Promise<void>(resolve => {
      process.on('SIGINT', () => {
        console.log('\n[beat] export watcher stopped')
        resolve()
      })
    })
  },
}

async function loadSong(songPath: string): Promise<Song> {
  if (songPath.endsWith('.beat')) {
    const text = readFileSync(songPath, 'utf8')
    const result = parseTab(text)
    for (const e of result.errors) {
      console.warn(`[beat] tab ${e.severity}: ${e.message}`)
    }
    return result.song
  }
  // ESM caches imports by URL — bust with a query string so each
  // watch-triggered reload picks up the latest TS source.
  const url = pathToFileURL(songPath).href + `?t=${Date.now()}`
  const mod = (await import(url)) as { default: Song }
  return mod.default
}

function resolveHumanize(
  song: Song,
  args: Args,
): HumanizeConfig | null | undefined {
  if (args.humanize === 'off') return null
  if (args.humanize !== undefined) {
    return {
      ...HUMANIZE[args.humanize as HumanizePreset],
      seed: args.seed,
    }
  }
  if (args.seed !== undefined && song.humanize) {
    return { ...song.humanize, seed: args.seed }
  }
  return undefined
}
