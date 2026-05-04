// Export a song to a .mid file.
//
//   pnpm cli export                            # default song
//   pnpm cli export tool/grudge                # specific song
//   pnpm cli export tool/grudge --output ~/Desktop/grudge.mid
//   pnpm cli export tool/grudge --humanize off # bare grid
//   pnpm cli export tool/grudge --humanize loose --seed 42

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Argv, CommandModule } from 'yargs'

import { exportSongToMidi } from '@/code/export/midi'
import { HUMANIZE, type HumanizePreset } from '@/code/humanize'
import type { Song } from '@/code/song'

type Args = {
  song: string
  output?: string
  humanize?: string
  seed?: number
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
      }) as Argv<Args>,
  handler: async args => {
    const songDir = resolve(__dirname, `../../test/${args.song}`)
    const songPath = ['index.ts', 'text.ts', 'code.ts', 'data.ts']
      .map(f => resolve(songDir, f))
      .find(p => existsSync(p))
    if (!songPath) {
      throw new Error(
        `No song file found in ${songDir} ` +
          `(looked for index.ts / text.ts / code.ts / data.ts)`,
      )
    }
    const mod = (await import(pathToFileURL(songPath).href)) as {
      default: Song
    }
    const song = mod.default

    const outputPath = resolve(
      __dirname,
      '../..',
      args.output ?? `out/${args.song.replace(/\//g, '-')}.mid`,
    )

    let humanizeConfig
    if (args.humanize === 'off') {
      humanizeConfig = null
    } else if (args.humanize !== undefined) {
      humanizeConfig = {
        ...HUMANIZE[args.humanize as HumanizePreset],
        seed: args.seed,
      }
    } else if (args.seed !== undefined && song.humanize) {
      humanizeConfig = { ...song.humanize, seed: args.seed }
    }

    exportSongToMidi(song, { outputPath, humanize: humanizeConfig })
    console.log(`[beat] wrote ${outputPath}`)
  },
}
