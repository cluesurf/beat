// Kill any straggling `beat play` processes. Run before a new
// play session to make sure only one process is driving Logic
// over Ableton Link — otherwise multiple peers fire drum hits
// in parallel and you hear doubled, slightly-offset notes.
//
// Stragglers happen because play.ts only handles SIGINT, so a
// terminal tab closed without typing `q` / Ctrl-C leaves the
// Node process running forever with the Link socket open.

import { execSync } from 'node:child_process'
import type { CommandModule } from 'yargs'

// Match the first token of a `ps command` line when it's a node
// invocation: either bare `node` or any absolute path ending in
// `/node`. The chained `sh -c "stop && play"` shell that runs
// us has `code/console/index.ts play` in its command line too,
// but it starts with `/bin/sh`, so this filter excludes it.
const FIRST_TOKEN_NODE = /^(?:\S*\/)?node(?:\s|$)/

function getAncestors(startPid: number): Set<number> {
  const ancestors = new Set<number>([startPid])
  let current = startPid
  while (current > 1) {
    try {
      const out = execSync(`ps -o ppid= -p ${current}`, {
        encoding: 'utf8',
      }).trim()
      const ppid = Number.parseInt(out, 10)
      if (!ppid || ppid === current || ancestors.has(ppid)) break
      ancestors.add(ppid)
      current = ppid
    } catch {
      break
    }
  }
  return ancestors
}

export const stopCommand: CommandModule = {
  command: 'stop',
  describe: 'Kill straggling beat play processes',
  handler: async () => {
    const ancestors = getAncestors(process.pid)

    let psOutput = ''
    try {
      psOutput = execSync('ps -Ao pid=,command=', { encoding: 'utf8' })
    } catch {
      console.log('[beat] could not read process list')
      return
    }

    const targets: { pid: number; cmd: string }[] = []
    for (const line of psOutput.split('\n')) {
      const m = line.match(/^\s*(\d+)\s+(.*)$/)
      if (!m) continue
      const pid = Number.parseInt(m[1]!, 10)
      const cmd = m[2]!
      if (ancestors.has(pid)) continue
      if (!FIRST_TOKEN_NODE.test(cmd)) continue
      if (!cmd.includes('code/console/index.ts')) continue
      if (!/\bplay\b/.test(cmd)) continue
      targets.push({ pid, cmd })
    }

    if (targets.length === 0) {
      console.log('[beat] no straggling play processes')
      return
    }

    console.log(`[beat] killing ${targets.length} straggler(s):`)
    for (const { pid, cmd } of targets) {
      console.log(`  ${pid}  ${cmd.slice(0, 100)}`)
    }

    // SIGTERM first so any handler the script has a chance to
    // clean up (Link stop, all-notes-off). Stragglers usually
    // ignore it because play.ts doesn't wire SIGTERM, so we
    // wait briefly then SIGKILL whatever remains.
    for (const { pid } of targets) {
      try {
        process.kill(pid, 'SIGTERM')
      } catch {
        // Already dead.
      }
    }

    await new Promise(r => setTimeout(r, 400))

    let killed = 0
    for (const { pid } of targets) {
      try {
        process.kill(pid, 0)
        process.kill(pid, 'SIGKILL')
        killed++
      } catch {
        // Exited from SIGTERM.
      }
    }

    if (killed > 0) {
      console.log(`[beat] force-killed ${killed} that ignored SIGTERM`)
    }
  },
}
