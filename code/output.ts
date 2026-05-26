// MIDI output. Resolves IAC virtual MIDI ports by name fragment
// and routes hits to the right one.
//
// Two layers:
//
//   - `openDrumOutput()` — the lean single-port helper. Opens the
//     one default port (DEFAULT_BUS / "TS Drum Engine"). Kept for
//     simple use + backward compatibility.
//
//   - `MidiRouter` — multi-port. Opens ports on demand, keyed by
//     name fragment, and hands back the matching `easymidi.Output`
//     for a given hit's `port`. Used by the player so a single
//     song can fan out across the kit / world / cinematic /
//     electronic IAC buses.
//
// Both throw with a clear, actionable hint when a named port is
// missing instead of failing silently inside easymidi.

import easymidi from 'easymidi'

import { DEFAULT_BUS } from './route'

function resolvePort(fragment: string): easymidi.Output {
  const ports = easymidi.getOutputs()
  const match = ports.find(name => name.includes(fragment))
  if (!match) {
    console.error('Available MIDI outputs:', ports)
    throw new Error(
      `MIDI port containing "${fragment}" not found.\n` +
        'Open Audio MIDI Setup → MIDI Studio → IAC Driver, ' +
        'enable "Device is online", and add a port whose name ' +
        `contains "${fragment}".`,
    )
  }
  return new easymidi.Output(match)
}

// Lean single-port output (the default bus). Unchanged behavior.
export function openDrumOutput(): easymidi.Output {
  const out = resolvePort(DEFAULT_BUS)
  console.log(`[beat] sending to MIDI port: ${DEFAULT_BUS}`)
  return out
}

// Multi-port router. Lazily opens each IAC port the first time a
// hit needs it, caches the handle, and resolves later hits to the
// cached output. Call `closeAll()` on teardown.
export class MidiRouter {
  private readonly outputs = new Map<string, easymidi.Output>()
  private readonly defaultPort: string

  constructor(defaultPort: string = DEFAULT_BUS) {
    this.defaultPort = defaultPort
  }

  // Resolve (opening if needed) the output for a port fragment.
  // Falls back to the default port when none is given.
  resolve(port?: string): easymidi.Output {
    const key = port ?? this.defaultPort
    let out = this.outputs.get(key)
    if (!out) {
      out = resolvePort(key)
      this.outputs.set(key, out)
      console.log(`[beat] opened MIDI port: ${key}`)
    }
    return out
  }

  // Every port currently open. Used by teardown to send
  // all-notes-off across the whole rig.
  all(): easymidi.Output[] {
    return [...this.outputs.values()]
  }

  closeAll(): void {
    for (const out of this.outputs.values()) out.close()
    this.outputs.clear()
  }
}
