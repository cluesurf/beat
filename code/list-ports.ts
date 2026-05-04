// Print every MIDI input + output macOS sees right now.
// Use to debug "I don't see TS Drum Engine in the list" —
// confirms the IAC port is set up correctly before you run
// the actual sender.
//
// Run: pnpm list:ports

import easymidi from 'easymidi'

console.log('--- MIDI inputs ---')
for (const name of easymidi.getInputs()) {
  console.log(`  ${name}`)
}

console.log('\n--- MIDI outputs ---')
for (const name of easymidi.getOutputs()) {
  console.log(`  ${name}`)
}
