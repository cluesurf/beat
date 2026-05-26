// Single yargs entry point. Subcommands live in sibling files.
//
//   pnpm cli play [song] [--once] [--restart] [--pattern <name>]
//   pnpm cli boot
//   pnpm cli loop [--interval 500]
//   pnpm cli list-ports

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { playCommand } from './play'
import { stopCommand } from './stop'
import { tryCommand } from './try'
import { loopCommand } from './loop'
import { listPortsCommand } from './list-ports'
import { testAllCommand } from './test-all'
import { findNoteCommand } from './find-note'
import { exportCommand } from './export'

await yargs(hideBin(process.argv))
  .scriptName('beat')
  .command(playCommand)
  .command(stopCommand)
  .command(tryCommand)
  .command(loopCommand)
  .command(listPortsCommand)
  .command(testAllCommand)
  .command(findNoteCommand)
  .command(exportCommand)
  .demandCommand(1)
  .strict()
  .help()
  .parseAsync()
