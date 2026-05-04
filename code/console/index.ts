// Single yargs entry point. Subcommands live in sibling files.
//
//   pnpm cli play [song] [--once] [--restart] [--pattern <name>]
//   pnpm cli boot
//   pnpm cli loop [--interval 500]
//   pnpm cli list-ports

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { playCommand } from './play'
import { bootCommand } from './boot'
import { loopCommand } from './loop'
import { listPortsCommand } from './list-ports'
import { testAllCommand } from './test-all'

await yargs(hideBin(process.argv))
  .scriptName('beat')
  .command(playCommand)
  .command(bootCommand)
  .command(loopCommand)
  .command(listPortsCommand)
  .command(testAllCommand)
  .demandCommand(1)
  .strict()
  .help()
  .parseAsync()
