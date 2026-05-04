// Tiny continuous loop — kick / snare alternating every 500ms.
// Useful for verifying Logic actually sustains output, not
// just plays a single hit and dies.
//
// Ctrl-C to stop.
//
// Run: pnpm boot:loop

import { openDrumOutput } from './output'
import { sendHit } from './hit'
import { NOTE } from './note'

const output = openDrumOutput()

let step = 0

const interval = setInterval(() => {
  const note = step % 2 === 0 ? NOTE.kick : NOTE.snare
  sendHit(output, { note })
  step++
}, 500)

// Clean shutdown — close the MIDI port so macOS releases the
// virtual cable instead of leaving a stale connection that
// blocks the next run.
process.on('SIGINT', () => {
  clearInterval(interval)
  output.close()
  console.log('\n[beat] loop stopped')
  process.exit(0)
})
