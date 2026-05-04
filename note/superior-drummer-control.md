# Controlling Superior Drummer 3 from TypeScript

Short answer:

**Yes for performance. Mostly no for kit building.**

You can control any sound that's already loaded. You cannot script
kit-piece swaps or tuning changes.

## What you CAN drive over MIDI

All of this is "just MIDI" and works today through the IAC bus.

| Lever                     | How                                                               |
| ------------------------- | ----------------------------------------------------------------- |
| Pitch (any drum)          | MIDI Pitch Bend on the channel that drum lives on                 |
| Velocity → tone           | SD3 maps velocity layers to articulation (rim, ghost, rimshot)    |
| Articulation              | Per-piece note number (e.g. snare main 38 / rim 40 / sidestick 37 |
| Hi-hat openness           | CC 4 (Foot Controller) or CC 1 — SD3 maps it to hat position      |
| Mixer level (per channel) | MIDI volume CC 7 on that channel                                  |
| Mute / solo (mixer)       | Custom MIDI Learn → CC                                            |
| Kit-piece variation       | "Articulation" CCs SD3 exposes via Mapping window                 |
| Sustain / choke           | CC 64 sustain, or note-on at velocity 1 = choke for cymbals       |

So: **per-hit pitch, per-hit volume, per-hit articulation, per-hit choke
— all from `code/hit.ts`-style note-on plus CCs.**

Add a CC sender in `code/hit.ts`:

```ts
output.send('cc', { controller: 4, value: 80, channel: DRUM_CHANNEL })
```

That alone unlocks sweep-able hi-hat, articulation morphing, and per-hit
volume rides.

## What you CANNOT drive over MIDI

These live in SD3's GUI / preset format. No public API.

- Loading a different kit preset from disk
- Swapping one drum sample for another
- Changing the global tuning / pitch knob on a drum
- Adjusting the per-channel EQ / compressor / send levels
- Loading a different room mic configuration
- Adding extra toms or cymbals to the kit
- Saving a kit preset

These are all GUI clicks. Workflow: **set the kit up once, save it as a
preset, recall it manually.** The TS engine handles the playing only.

## What "no API" actually means

SD3 is a closed binary plugin (VST/AU). Toontrack does not expose:

- A scripting language (Logic's Scripter is JS but only for MIDI in/out,
  not plugin GUI)
- A preset file format meant for third-party tooling
- Inter-process communication beyond audio + MIDI

Even Logic itself can only swap SD3 presets via Logic's own
plugin-preset mechanism, which isn't programmable from TypeScript.

## Workarounds for "I really need to swap kits programmatically"

Three escape hatches, in order of effort:

### A. Multiple SD3 instances on different tracks

Set up 4 SD3 tracks in Logic, each with a different kit preset. Route TS
MIDI to channel 1 / 2 / 3 / 4 and "switching kits" becomes "switching
channel" in your `Hit`.

```ts
{ beat: 0, note: NOTE.kick, channel: 0 } // Kit A track
{ beat: 1, note: NOTE.kick, channel: 1 } // Kit B track
```

Cost: more RAM, but fully programmable.

### B. Multi-output routing inside one SD3

SD3 supports multi-out. Each drum can leave on its own bus. Then on each
bus you put a different instance of an EQ / saturator / pitch plugin and
morph **that** plugin via MIDI Learn → CC.

You can't change the source sample, but you can dramatically reshape its
tone in real time.

### C. Kontakt / Battery / a sampler with NKS scripting

If kit-swapping in real time is core, switch the sample engine to one
that exposes scripting (Kontakt's KSP). SD3 is the wrong tool for that
specific problem.

## Practical layering for the TS engine

The right architecture given SD3's limits:

```
TS engine                         SD3 / Logic
─────────                         ───────────
patterns + arrangement     ───►   notes + velocities + CCs
pitch bend / CC streams    ───►   per-hit articulation
choke (vel-1 hits)         ───►   cymbal damping
multi-track routing        ───►   "kit slot A vs B"

(set up once, in the GUI:        kit preset
                                  per-piece samples
                                  per-piece tuning
                                  mixer + bus FX)
```

Mental model: **TypeScript is the drummer. SD3 is the drum kit. You
don't programmatically change the kit between songs — you program the
drummer.**

## What to add to `code/hit.ts` next

Concrete additions that unlock real expressive control without leaving
MIDI:

```ts
type Hit = {
  beat: number
  note: number
  velocity?: number
  durationMs?: number
  channel?: number
  pitchBend?: number // -8192 to +8191, snapped before note-on
  hiHatOpenness?: number // 0–127, sends CC 4 before note-on
  articulation?: number // SD3 mapping CC, configured per kit
  choke?: boolean // velocity-1 second hit on same note
}
```

Send the CCs immediately before `noteon`, and you have:

- Sliding tom pitch (pitchBend stream during a fill)
- Hi-hat opening through a phrase
- Choked crash on demand
- Per-piece articulation morphing

That's already 80% of "programmatic SD3 control" without any plugin
hacking.

## Bottom line

| Want                              | Possible from TS?               |
| --------------------------------- | ------------------------------- |
| Different velocity on every hit   | Yes                             |
| Different pitch on every hit      | Yes (pitch bend)                |
| Different articulation per hit    | Yes (note number / CC)          |
| Different hi-hat openness per hit | Yes (CC 4)                      |
| Different per-drum mixer level    | Yes (CC 7)                      |
| Different drum kit per song       | Yes — via separate Logic tracks |
| Different sample for one drum     | No (GUI only)                   |
| Different tuning on one drum      | No directly. Use pitch bend.    |
| Add a new tom to the kit          | No (GUI only)                   |
| Save a preset                     | No (GUI only)                   |

Set the kit up once in SD3's GUI. Drive everything performable from TS.
