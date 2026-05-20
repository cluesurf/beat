# Syncing Ableton Live 12 with the beat engine

## Quickstart

Each step references the exact UI element in Live 12's
top-left toolbar (left-to-right: yellow square icon, then the
Link badge, Tap, tempo, metronome icons, time signature,
metronome circle, **global quantization**, key root, key
mode, transport, position, etc.).

- **Confirm Link is on** — the **"Link"** badge in the top
  toolbar (third element from the left, just right of "Tap")
  should be lit up. When a peer connects it shows **"1 Link"**
  (or higher). If yours says plain "Link" with no count, the
  script just hasn't joined yet — the number appears
  automatically when you run `pnpm play`.
- **Enable Start Stop Sync** — click the "Link" / "1 Link"
  badge to open its popover, then check **Start Stop Sync**.
  Off by default. Without it, Live follows tempo and beat
  phase but ignores `play` / `stop` from the script.
- **Set global launch quantization to "None"** — this is the
  dropdown currently showing **"1 Bar"** in the top toolbar
  (between the `4 / 4` time signature and the key signature).
  Click it and pick **"None"**. Otherwise Live waits up to a
  full bar after receiving play before it actually starts —
  drums fire immediately from the script, Live's audio joins
  late.
- **Match the project tempo to the `.beat`'s `bpm`** — the
  tempo readout (currently **"104.00"**, fourth element from
  the left). Whichever Link peer most recently set tempo
  wins; when Live presses play it asserts its tempo onto the
  session, so a mismatch means drums play at Live's rate, not
  the `.beat`'s.
- **Match the time signature** — currently **`4 / 4`** in the
  top bar. Use `--quantum 4` on the script (the default). For
  7/8 set Live to `7 / 8` and use `--quantum 7`.
- **Enable the IAC input** — Live → Settings → **Tempo &
  MIDI** → scroll to **Input Ports**. In the row for "IAC
  Driver (TS Drum Engine)" (or whatever you named the IAC
  bus in macOS Audio MIDI Setup), toggle **Track ✓** on.
  Leave the **Sync**, **Remote**, and **MPE** columns OFF for
  this row. See the "MIDI Ports panel" section below for what
  each column does and why these defaults matter.
- **Add or repurpose a drum-receive MIDI track** — either
  reuse an empty MIDI track (e.g. `2 MIDI`) or create a new
  one with **Cmd+Shift+T**. The routing controls are on the
  **far-right edge of the track's row in Arrangement view**,
  stacked top-to-bottom: name → **`All Ins ▼`** (MIDI From
  port) → **`All Channels ▼`** (MIDI From channel) →
  `In Auto Off` (monitor) → `Main` / `No Output` (MIDI To).
  Click **`All Ins`** and pick **"IAC Driver (TS Drum
  Engine)"**. Click **`All Channels`** and pick **"Ch. 10"**
  (the script sends drums on GM channel 10 — `DRUM_CHANNEL =
  9` zero-indexed in code/note.ts). See the "Track header
  routing" section below if you can't find these dropdowns.
- **Drop a Drum Rack on that track** — Browser → Drums →
  Drum Rack → drag onto the new track. Map the pads to the
  notes your `.beat` file uses (kick = C1 / MIDI 36, snare =
  D1 / 38, hat = F#1 / 42 by default — see code/note.ts for
  the full mapping).
- **Arm the drum track** — click the small circle on the
  track header (it turns red when armed). MIDI from IAC won't
  trigger the Drum Rack otherwise.
- **Set the Arrangement loop brace** — drag the loop bracket
  across the bars you want to repeat (top of the timeline,
  above bar 1). Click the **loop toggle** in the transport so
  it lights up.
- **Park the playhead at bar 1** — click bar 1 in the
  timeline ruler (or whichever bar is the start of your loop
  brace). Live's transport will resume from wherever the
  playhead is, so if it's parked mid-bar you'll hear audio
  drift relative to drums.
- **Run the script**: `pnpm play <song> --sync link` in the
  terminal. `pnpm play` runs `pnpm stop` first to kill any
  straggling beat process.
- **Press space**. Drums (script) and audio (Live) start
  together. Press space again to stop both.
- **Quit cleanly** with **`q`** or **Ctrl-C** in the terminal.
  Closing the terminal window orphans the Node process — the
  Link socket stays open and a phantom drummer will trigger
  next time Live presses play. `pnpm play` clears stragglers
  on next launch, or run `pnpm stop` manually.

Details below.

## Sync modes

The `play` command supports three sync modes via `--sync`:

- `internal` (default) — wall-clock setTimeout, no DAW.
- `master` — emit 24 PPQN MIDI clock + start/stop. Live will
  follow this if its MIDI sync preferences are set, but Link
  is simpler and more accurate. Prefer `link`.
- `link` — Ableton Link peer. This is the native sync method
  for Live; both apps were built around it.

```bash
pnpm play tool/grudge --sync link
pnpm play tool/grudge --sync link --quantum 7  # for 7/8
```

`pnpm play` runs `pnpm stop` first, so any straggling beat
process from a previous session is killed before the new one
joins the Link network. Without this, multiple peers fire
drum hits in parallel and you hear doubled, slightly-offset
notes.

## Ableton Live setup

Link is a top-bar toggle in Live, not a project setting:

1. **Click the "Link" button in Live's top-left toolbar.** It
   should light up. If you don't see it, enable it in
   Preferences → Tempo & MIDI → Show Link Toggle.
2. **Click the Link toggle again to open its popover, then
   check "Start Stop Sync".** This is off by default. Without
   it, Live follows the session tempo and beat phase but
   ignores `link.play()` / `link.stop()` from peers — pressing
   space in the terminal will start the drums but Live's
   transport stays parked. Toggling Start Stop Sync is the
   fix.

That's the global side. For the script to drive Live's drum
voicing, route the IAC bus into a MIDI track:

3. **Preferences → Tempo & MIDI → MIDI Ports** — enable
   **Track** on the input row for "IAC Driver TS Drum Engine"
   (or whatever you named the IAC port).
4. **Create a MIDI track**, set its MIDI From to the IAC port,
   load a Drum Rack (or your sampler of choice), and arm it.

When the script starts, Live's top bar shows "1 Link" and
Live's tempo follows the session. The first time the Node
process opens a Link socket, macOS may prompt for
incoming-network permission. Allow it.

## MIDI Ports panel (Settings → Tempo & MIDI)

Live → Settings → **Tempo & MIDI** → scroll past "Tempo
Follower", "Resync External Hardware", and the six
"Control Surface" rows. Below those are two tables:
**Input Ports** and **Output Ports**.

Each row is one of the MIDI endpoints macOS exposes (IAC
buses, Logic's virtual ports, plug-in virtual ports, hardware
interfaces). Columns are checkboxes you can flip per row.

### Input Ports columns

- **Track** — Live can use this port as a source for MIDI
  tracks (it shows up in a track's `MIDI From` dropdown).
  **Enable for "IAC Driver (TS Drum Engine)".** Without this,
  the IAC port simply won't appear when you try to set MIDI
  From on a track, so the script's drums never reach a Drum
  Rack.
- **Sync** — Live listens for **MIDI Clock / MTC** on this
  port and slaves to it. **Leave OFF for the IAC drum port.**
  You're using `--sync link`, not `--sync master`, so the
  script doesn't emit clock here. Enabling Sync would only
  matter if you switched to `--sync master`, but Link is
  strictly better — there's no reason to.
- **Remote** — Live interprets MIDI on this port as
  **controller input** (CCs map to faders, notes map to
  buttons, etc.). **Leave OFF.** Drum note-ons aren't control
  data; with Remote on, Live would try to map drum hits to
  random UI elements.
- **MPE** — Live processes the port as an **MPE** source
  (multidimensional polyphonic expression — per-note pitch
  bend, slide, pressure). **Leave OFF.** The script sends
  plain note-on events, not MPE.

### Output Ports columns

- **Track** — Live can route MIDI tracks to this port (it
  shows up in `MIDI To` dropdowns). **Leave OFF for the IAC
  drum port.** If you turn it on AND a track's MIDI To
  targets this port AND that track is set to monitor the IAC
  drum input, you create a feedback loop: script → IAC → Live
  → IAC → script.
- **Sync** — Live emits MIDI Clock out this port. Leave OFF.
- **Remote** — Live sends MIDI feedback to a control surface
  via this port. Leave OFF for IAC.

### Recommended state for the IAC drum port

For "IAC Driver (TS Drum Engine)" specifically:

| Direction | Track | Sync | Remote | MPE |
| --------- | ----- | ---- | ------ | --- |
| Input     | ✓     | ✗    | ✗      | ✗   |
| Output    | ✗     | ✗    | ✗      | —   |

The other ports in your panel (IAC Bus 1, Logic Pro Virtual
Out, Superior Drummer 3) can have any settings independently
of these. They don't affect drum routing for this engine.

## Track header routing (where MIDI From / channel lives)

In **Arrangement view**, each track's input / output controls
sit on the **far-right edge** of the track row, not at the
left where the track name and clips are. The header is a
vertical stack of dropdowns. For a MIDI track they read,
top-to-bottom:

1. **Track name** (e.g. `2 MIDI`, `1 CodeLink`).
2. **MIDI From — port** (default `All Ins`). Click and pick
   **"IAC Driver (TS Drum Engine)"** so the track listens to
   what the script sends.
3. **MIDI From — channel** (default `All Channels`). Click
   and pick **"Ch. 10"** to filter to GM drum channel only.
4. **Monitor** — three small buttons `In` / `Auto` / `Off`.
   Leave `Auto`. That way the Drum Rack hears incoming MIDI
   when the track is armed, but doesn't double-trigger if
   something else is recording.
5. **MIDI To** (default `Main` or `No Output`). Leave alone.
   The Drum Rack's audio output goes to Main automatically.

To the **right of the dropdown column** are the small track
buttons: track index number, **S** (solo), and a **circle**
(arm / record-enable). **Click the circle until it turns
red.** Without arming, MIDI arrives at the track but the Drum
Rack doesn't fire.

If you don't see these dropdowns at all, the In/Out section
is hidden. Show it via the **I-O** switch in the column of
show/hide letters in the bottom-right corner of the
Arrangement view, or from the View menu → "In/Out".

## Launch quantization (the big difference from Logic)

Live has a **launch quantization** setting in the top bar (the
dropdown near the Link toggle, default "1 Bar"). When Live
receives a Link play state change, it waits until the next
launch-quantization boundary to actually start its transport.

This conflicts with how this script starts: the script anchors
its origin at the **current Link beat** and fires drums from
beat 0 of the loop immediately. If Live's launch quantization
is "1 Bar", Live waits up to one bar — drums fire now, guitar
starts up to a bar later.

**Set launch quantization to "None"** for the cleanest sync:

- Top bar dropdown → "None".

Now Live also starts immediately when it receives play, and
both transports begin together. If you prefer Live's quantized
launch behavior (so the downbeat always lands on a bar line),
keep "1 Bar" but be aware that you'll hear a count-in of drums
before Live joins.

## Terminal controls

- **`<space>`** — play / stop. On play, the script anchors its
  song origin to the current Link beat and fires drums from
  beat 0 of the loop immediately. Live (with launch
  quantization set to "None") starts its transport at the same
  moment.

  For drums and audio to land on the same downbeat, **position
  Live's playhead at the loop brace start (Arrangement view)
  or trigger the right clip (Session view) before pressing
  space.** If Live resumes from somewhere mid-bar, audio plays
  the gap first while drums have already been running since
  space.
- **`q`** or **Ctrl-C** — clean exit. Disables Link, sends
  all-notes-off, releases ports. **Always quit this way.** If
  you close the terminal window instead, the script orphans
  itself (SIGHUP isn't handled) and keeps holding the Link
  socket. `pnpm play` will clear stragglers automatically next
  time, but you can run `pnpm stop` manually.

Live's own play / stop also propagates (Start Stop Sync was
enabled above), so you can drive transport from either app.

## Live editing

Save the `.beat` file → tick map rebuilds on the next Link
update. If the song's `bpm` changed, the new tempo is pushed
to the Link session and Live adjusts. The transport never
hiccups.

Hot reload only supports `.beat` files. TS songs require a
restart — the synchronous read avoids stalling the update
callback, which an ESM dynamic import would do.

## Tempo conflicts

Link shares a single tempo across all peers; whichever peer
most recently set the tempo wins. Live asserts its project
tempo onto the session whenever you start its transport.

If Live's project tempo doesn't match the `.beat` file's
`bpm`, drum scheduling will follow Live's tempo (the script
schedules off Link's beat counter), so the loop plays at the
wrong rate.

Two fixes:

1. **Quick**: set Live's project tempo to match the `.beat`'s
   `bpm` before pressing play.
2. **Robust**: the script only re-applies `map.bpm` on a
   `.beat` save (see code/console/play.ts in the link mode).
   For automatic tempo defense, the script would need to
   re-set `link.bpm = map.bpm` on every update — not yet
   wired.

## Bar alignment

Link maintains a shared, monotonically-increasing beat counter
across all peers and a quantum (bar length, set with
`--quantum`). The script anchors `songBeat = linkBeat - origin`
where `origin` is the Link beat at the moment play begins. As
long as the song's total length in beats is a whole multiple
of the quantum, the loop re-aligns with Live's bars on every
wrap.

For 4/4 keep `--quantum 4` (the default). For 7/8 use
`--quantum 7`. Mixed-meter songs: pick the most common bar
length; downbeats may drift on bars of other lengths.

## Sanity checks

1. Live's top bar shows "1 Link" once the script is running.
   If it shows nothing or "0", the peers aren't discovering
   each other — check macOS firewall, and confirm Live's Link
   toggle is actually on.
2. Tempo in Live should match the song's `bpm`. With Link
   active, both peers converge on the most-recently-set
   tempo.
3. The Drum Rack receives MIDI when you press space (look for
   the MIDI input meter activity on the track). If not, the
   IAC port isn't routed to the track input.
4. No phantom drums after `q`. If there are, `pnpm stop` to
   confirm no stragglers, then check Live's track isn't
   echoing MIDI back through Live's own MIDI thru.

## When Link doesn't work

Fall back to `--sync master` if Link itself isn't
discovering. Live will follow MIDI clock if you enable it in
Preferences → Tempo & MIDI → MIDI Ports → Sync on the
IAC input row. This works but introduces a tempo lock that
can't be edited live from the `.beat` file.

For drums without any DAW sync, `--sync internal` runs the
loop on Node timers and doesn't touch Logic / Live at all.
Useful for previewing a `.beat` standalone.

## Latency tuning

If drums sound consistently behind Live's audio, dial in
`--offsetMs`:

```bash
pnpm play tool/grudge --sync link --offsetMs 30
```

Positive values shift drum hits earlier (good for IAC + Drum
Rack chain latency vs Live's direct audio engine). Start with
20–40ms and adjust by ear until drums lock with Live's
guitar / bass / whatever. Negative values delay drums — useful
if your Drum Rack has unusually low latency.
