// 4-hit smoke test: kick, snare, kick, snare — half-second
// spacing. Fastest way to confirm the IAC bus + Logic + SD3
// chain is alive.

import type { CommandModule } from 'yargs'
import { openDrumOutput } from '@/code/output'
import { sendHit } from '@/code/hit'
import { NOTE } from '@/code/note'

export const tryCommand: CommandModule = {
  command: 'try',
  describe: 'Hello-world: send 4 drum hits',
  handler: async () => {
    const output = openDrumOutput()
    const hits = [
      { beat: 0, note: NOTE.kick },
      { beat: 1, note: NOTE.snare },
      { beat: 2, note: NOTE.kick },
      { beat: 3, note: NOTE.snare },
    ]

    const ms = 500
    for (const hit of hits) {
      setTimeout(() => sendHit(output, hit), hit.beat * ms)
    }

    setTimeout(() => {
      output.close()
      console.log('[beat] done')
    }, hits.length * ms + 200)
  },
}
