// Print every MIDI input + output the OS exposes. Sanity check
// that "TS Drum Engine" (or whatever you named your IAC port)
// shows up in the outputs list.

import type { CommandModule } from 'yargs'
import easymidi from 'easymidi'

export const listPortsCommand: CommandModule = {
  command: 'list-ports',
  describe: 'List every MIDI input + output',
  handler: async () => {
    console.log('inputs:')
    for (const name of easymidi.getInputs()) console.log(`  ${name}`)
    console.log('outputs:')
    for (const name of easymidi.getOutputs()) console.log(`  ${name}`)
  },
}
