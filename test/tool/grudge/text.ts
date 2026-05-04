// Tool — "The Grudge". The actual tab lives in `text.beat`
// alongside this file; this module just loads + parses it.

import { load } from '@/code/tab/load'

const song = load('tool/grudge/text.beat')
song.name = 'Tool — The Grudge'
song.humanize = {
  timing: 0.012,
  velocity: 6,
  timingBias: -0.15,
}

export default song
