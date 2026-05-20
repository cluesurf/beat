# Syncing Logic Pro with the beat engine

The `play` command supports three sync modes via `--sync`:

- `internal` (default) — wall-clock setTimeout, no DAW.
- `master` — emit 24 PPQN MIDI clock + start/stop. **Does not
  work with Logic Pro 11**, which dropped MIDI Clock as a sync
  source. Kept for use with Ableton, Reaper, hardware sequencers.
- `link` — Ableton Link peer. The right answer for Logic Pro 11+.

```bash
pnpm cli play tool/grudge --sync link
pnpm cli play tool/grudge --sync link --quantum 7  # for 7/8
```

## Logic Pro setup

**File → Project Settings → Synchronization → General:**

- Sync Mode: **Ableton Link**

Then enable start/stop propagation, which is a separate toggle
and is **off by default**:

- Click the **Link** button in the control bar (or LCD area).
  A popover appears.
- Check **Start/Stop Sync**.

Without Start/Stop Sync, Logic follows the session's tempo and
bar phase but ignores `link.play()` / `link.stop()` from peers.
Pressing space in the terminal will start the drums but Logic's
transport stays parked. Toggling Start/Stop Sync is the fix.

Logic listens for Link peers on the local network (loopback
works, no LAN required). When the script starts, the transport
bar shows "1 Link" and Logic's tempo follows the session.

The first time the Node process opens a Link socket, macOS may
prompt for incoming-network permission. Allow it.

## Terminal controls

- **`<space>`** — play / stop. On play the script anchors its
  song origin to the current Link beat and fires drums from
  beat 0 of the loop immediately. Logic's Start/Stop Sync
  starts its transport immediately too, at the current
  playhead position. So drums and guitar both begin without
  delay.

  For both to land on the same downbeat, **position Logic's
  playhead at the cycle region start before pressing space.**
  If Logic resumes from somewhere mid-bar (or outside the
  cycle), guitar will play that gap first, then wrap to bar 1
  — meanwhile drums have been firing from bar 1 of the loop
  since space, so the two won't line up.
- **`q`** or **Ctrl-C** — clean exit. Disables Link, sends
  all-notes-off, releases ports.

Logic's own play / stop also propagates, provided **Start/Stop
Sync** is enabled in Logic's Link popover (see setup above).

## Live editing

Save the `.beat` file → tick map rebuilds on the next Link
update. If the song's `bpm` changed, the new tempo is pushed to
the Link session and Logic adjusts. The transport never
hiccups.

Hot reload only supports `.beat` files. TS songs require a
restart — the synchronous read avoids stalling the update
callback, which an ESM dynamic import would do.

## Bar alignment

Link maintains a shared, monotonically-increasing beat counter
across all peers and a quantum (bar length, set with
`--quantum`). The script anchors `songBeat = linkBeat - origin`
where `origin` is the start of the bar at the moment play
begins. As long as the song's total length in beats is a whole
multiple of the quantum, the loop re-aligns with Logic's bars
on every wrap.

For 4/4 keep `--quantum 4` (the default). For 7/8 use
`--quantum 7`. Mixed-meter songs: pick the most common bar
length; downbeats may drift on bars of other lengths.

## Sanity checks

1. Logic's transport bar shows "1 Link" (or higher) once the
   script is running. If it shows "0 Link", the peers aren't
   discovering each other — check macOS firewall, and confirm
   Logic's Sync Mode is actually Ableton Link.
2. Tempo in Logic should match the song's `bpm`. With Link
   active, both peers converge on the most-recently-set tempo.
3. The Link session tempo persists across script restarts
   (Logic remembers it). To force a tempo change, edit `bpm` in
   the `.beat` file with the script running.

## When Link doesn't work

Fall back to `--sync master` only with a non-Logic DAW (Ableton
will follow it; so will Reaper with MIDI clock sync enabled).
For Logic specifically without Link, the alternatives are MTC +
MMC (not implemented in the script — would require new code) or
exporting to `.mid` and dragging into Logic
(`pnpm cli export <song>`).
