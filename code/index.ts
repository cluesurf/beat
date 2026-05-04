// Hello-world MIDI: send four hits (kick / snare / kick /
// snare) over half a second each. If you have Logic Pro
// open with Superior Drummer 3 on a record-enabled track
// listening to the IAC bus, you'll hear it.
//
// Run: pnpm boot

import { openDrumOutput } from './output'
import { sendHit } from './hit'
import { NOTE } from './note'

const output = openDrumOutput()

setTimeout(() => sendHit(output, { note: NOTE.kick }), 500)
setTimeout(() => sendHit(output, { note: NOTE.snare }), 1000)
setTimeout(() => sendHit(output, { note: NOTE.kick }), 1500)
setTimeout(() => sendHit(output, { note: NOTE.snare }), 2000)

setTimeout(() => {
  output.close()
  console.log('[beat] done')
}, 2500)
