// Endless kick/snare alternation — a metronome you can leave
// running while wiring up Logic.

import type { Argv, CommandModule } from 'yargs'
import { openDrumOutput } from '@/code/output'
import { sendHit } from '@/code/hit'
import { NOTE } from '@/code/note'

type Args = { interval: number }

export const loopCommand: CommandModule<unknown, Args> = {
  command: 'loop',
  describe: 'Endless kick/snare loop (Ctrl-C to stop)',
  builder: (y: Argv): Argv<Args> =>
    y.option('interval', {
      type: 'number',
      default: 500,
      describe: 'Milliseconds between hits',
    }) as Argv<Args>,
  handler: async args => {
    const output = openDrumOutput()
    let i = 0
    const id = setInterval(() => {
      sendHit(output, { note: i % 2 === 0 ? NOTE.kick : NOTE.snare })
      i++
    }, args.interval)

    process.on('SIGINT', () => {
      clearInterval(id)
      output.close()
      console.log('\n[beat] stopped')
      process.exit(0)
    })
  },
}
