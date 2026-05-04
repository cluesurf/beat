// Walk every entry in NOTE, hit each sound twice. Useful to:
//
//   - Verify every articulation in the loaded SD3 kit makes
//     sound (silence = unmapped or wrong-velocity articulation).
//   - Identify which entries share a MIDI note number.
//   - Audition the kit before composing a pattern.
//
// Usage:
//   pnpm cli test-all
//   pnpm cli test-all --gap 150 --pause 600
//   pnpm cli test-all --velocity 90
//   pnpm cli test-all --filter hat        # only hi-hat entries
//   pnpm cli test-all --filter tom --velocity 110
//
// Each hit is logged on its own line with a wall-clock timestamp
// so you can scroll back and match the audio you heard to the
// articulation that fired it. Aliases for the same note share a
// log line:
//
//   [22:14:03.412] ♪ 1/2 [ 36] kick
//   [22:14:03.612] ♪ 2/2 [ 36] kick
//   [22:14:04.412] ♪ 1/2 [ 37] snareSidestick
//   [22:14:04.612] ♪ 2/2 [ 37] snareSidestick
//   [22:14:05.412] ♪ 1/2 [ 65] floorTomLowRim = highTimbale
//   ...

import type { Argv, CommandModule } from 'yargs'

import { openDrumOutput } from '@/code/output'
import { sendHit } from '@/code/hit'
import { NOTE, DRUM_CHANNEL } from '@/code/note'

type Args = {
  gap: number
  pause: number
  velocity: number
  filter?: string
}

export const testAllCommand: CommandModule<unknown, Args> = {
  command: 'test-all',
  describe: 'Hit every NOTE entry twice in a row',
  builder: (y: Argv): Argv<Args> =>
    y
      .option('gap', {
        type: 'number',
        default: 200,
        describe: 'Milliseconds between the two hits of one sound',
      })
      .option('pause', {
        type: 'number',
        default: 800,
        describe: 'Milliseconds between different sounds',
      })
      .option('velocity', {
        type: 'number',
        default: 100,
        describe: 'Velocity (1-127) for every hit',
      })
      .option('filter', {
        type: 'string',
        describe: 'Only test entries whose name contains this substring',
      }) as Argv<Args>,
  handler: async args => {
    await runTestAll(args)
  },
}

async function runTestAll(args: Args): Promise<void> {
  const output = openDrumOutput()

  // Group NOTE entries by their MIDI note number so we don't
  // hit the same physical note twice for "snare" and "snareHit"
  // aliases. Each unique note is logged with all its names.
  const grouped = new Map<number, string[]>()
  for (const [name, note] of Object.entries(NOTE)) {
    if (args.filter && !name.toLowerCase().includes(args.filter.toLowerCase())) {
      continue
    }
    const existing = grouped.get(note) ?? []
    existing.push(name)
    grouped.set(note, existing)
  }

  if (grouped.size === 0) {
    console.log(`[beat] no NOTE entries match --filter "${args.filter}"`)
    output.close()
    return
  }

  // Sort by MIDI note number ascending — easier to follow on
  // the SD3 Mapping window which is also note-ordered.
  const sorted = [...grouped.entries()].sort(([a], [b]) => a - b)

  console.log(
    `[beat] testing ${sorted.length} unique sounds ` +
      `(velocity ${args.velocity}, gap ${args.gap}ms, pause ${args.pause}ms)`,
  )

  let stopped = false
  process.on('SIGINT', () => {
    console.log('\n[beat] interrupted — stopping')
    stopped = true
    output.close()
    process.exit(0)
  })

  for (const [note, names] of sorted) {
    if (stopped) break

    const label = names.join(' = ')
    const noteText = String(note).padStart(3)

    for (let i = 0; i < 2; i++) {
      const stamp = new Date().toISOString().slice(11, 23)
      console.log(`  [${stamp}] ♪ ${i + 1}/2  [${noteText}] ${label}`)
      sendHit(output, {
        note,
        velocity: args.velocity,
        channel: DRUM_CHANNEL,
      })
      await sleep(args.gap)
    }

    await sleep(args.pause)
  }

  console.log(`[beat] done`)
  output.close()
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
