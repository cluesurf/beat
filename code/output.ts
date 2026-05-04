// Resolve the IAC virtual MIDI port that this engine sends to.
// Created via macOS Audio MIDI Setup → MIDI Studio → IAC Driver
// → "Add Port" called "TS Drum Engine".
//
// If the port is missing, the script throws with a clear hint
// instead of failing silently inside easymidi.

import easymidi from 'easymidi'

const TARGET_PORT_FRAGMENT = 'TS Drum Engine'

export function openDrumOutput(): easymidi.Output {
  const ports = easymidi.getOutputs()
  const match = ports.find(name => name.includes(TARGET_PORT_FRAGMENT))
  if (!match) {
    console.error('Available MIDI outputs:', ports)
    throw new Error(
      `MIDI port containing "${TARGET_PORT_FRAGMENT}" not found.\n` +
        'Open Audio MIDI Setup → MIDI Studio → IAC Driver, ' +
        'enable "Device is online", and add a port named ' +
        '"TS Drum Engine".',
    )
  }
  console.log(`[beat] sending to MIDI port: ${match}`)
  return new easymidi.Output(match)
}
