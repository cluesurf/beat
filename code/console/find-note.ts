// Chromatic note finder. Plays a range of MIDI notes one at a
// time on a chosen port + channel, logging each note number as
// it fires — so you can listen to the plugin loaded on that
// Ableton track and discover which note triggers which sound.
//
// This is how you fill in the provisional note maps for the
// world / cinematic / electronic packs: load the plugin (e.g.
// EastWest RA tabla) on its IAC channel, run this sweep, and
// note which number plays the articulation you want.
//
// Usage:
//   pnpm cli find-note                          # 36..84 on default port, ch 0
//   pnpm cli find-note --from 24 --to 96
//   pnpm cli find-note --port World --channel 0 # target the World bus, tabla
//   pnpm cli find-note --gap 1500               # slower, more time per note
//   pnpm cli find-note --from 53 --to 53        # re-hear one note
//
// Log line:
//   [22:14:03.412] ♪ note 60  (C4)  port=World ch=1
//
// Watch the log + listen; write the number into the worksheet
// (note/library/beat/note-map-worksheet.md) or straight into the
// pack file.

import type { Argv, CommandModule } from 'yargs'

import { MidiRouter } from '@/code/output'
import { sendHit } from '@/code/hit'

type Args = {
  from: number
  to: number
  channel: number
  port?: string
  gap: number
  velocity: number
}

// MIDI note number → name (C-1 .. G9), middle C (60) = C4.
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
function noteName(n: number): string {
  return `${NAMES[n % 12]}${Math.floor(n / 12) - 1}`
}

export const findNoteCommand: CommandModule<unknown, Args> = {
  command: 'find-note',
  describe:
    'Chromatically sweep a note range on a port/channel to discover a plugin mapping',
  builder: (y: Argv): Argv<Args> =>
    y
      .option('from', { type: 'number', default: 36, describe: 'First MIDI note' })
      .option('to', { type: 'number', default: 84, describe: 'Last MIDI note' })
      .option('channel', {
        type: 'number',
        default: 0,
        describe: 'MIDI channel 0-15 (Ableton "Ch." = this + 1)',
      })
      .option('port', {
        type: 'string',
        describe:
          'IAC port name fragment (e.g. World / Cinematic / Electronic). Default: the lean Kit port.',
      })
      .option('gap', {
        type: 'number',
        default: 1200,
        describe: 'Milliseconds per note (time to listen + log)',
      })
      .option('velocity', {
        type: 'number',
        default: 100,
        describe: 'Velocity (1-127) for every note',
      }) as Argv<Args>,
  handler: async args => {
    await runFindNote(args)
  },
}

async function runFindNote(args: Args): Promise<void> {
  const router = new MidiRouter()
  const output = router.resolve(args.port)
  const lo = Math.max(0, Math.min(127, args.from))
  const hi = Math.max(0, Math.min(127, args.to))
  const step = lo <= hi ? 1 : -1

  console.log(
    `[beat] find-note ${lo}..${hi} on port=${args.port ?? 'Kit(default)'} ` +
      `ch=${args.channel} (Ableton Ch. ${args.channel + 1}), ${args.gap}ms/note`,
  )

  let stopped = false
  process.on('SIGINT', () => {
    console.log('\n[beat] interrupted — stopping')
    stopped = true
    router.closeAll()
    process.exit(0)
  })

  for (let n = lo; step > 0 ? n <= hi : n >= hi; n += step) {
    if (stopped) break
    const stamp = new Date().toISOString().slice(11, 23)
    console.log(
      `  [${stamp}] ♪ note ${String(n).padStart(3)}  (${noteName(n).padEnd(4)})` +
        `  port=${args.port ?? 'Kit'} ch=${args.channel}`,
    )
    sendHit(output, {
      note: n,
      velocity: args.velocity,
      channel: args.channel,
    })
    await sleep(args.gap)
  }

  console.log('[beat] done')
  router.closeAll()
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
