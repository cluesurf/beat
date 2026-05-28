#!/usr/bin/env node
// Single yargs entry point — also the `beat` bin. Subcommands live
// in sibling files.
//
//   beat play <path/to/song.beat>   # play a .beat file (any cwd)
//   beat play <song-folder>         # a folder with a .beat / index.ts
//   beat play example               # a bundled demo under test/
//   beat try | find-note | list-ports | test-all | export | loop | stop
//
// (Same commands run in-repo via `pnpm cli <command>`.)

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { playCommand, defaultPlayCommand } from './play'
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
  .command(defaultPlayCommand)
  .demandCommand(1)
  .strict()
  .help()
  .parseAsync()
