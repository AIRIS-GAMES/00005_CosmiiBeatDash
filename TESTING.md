# Local validation

Install dependencies with `npm ci`, then install the test browser with `npm run test:setup`.
Run `npm run web:build` followed by `npm test`.
The pinned Playwright dependency is local; no external npm-cache path is required.

Run `npm run cap:sync:ios` to rebuild www and sync the iOS public assets from source.
Source audio masters and store artwork in Asset remain available for regeneration, but are excluded from www and the app bundle.
Keep official character PNGs and font license files unchanged.

## Audio

`npm test` includes `scripts/test-audio-levels.js`, which measures the audio files that actually ship
and checks them against the budget in `scripts/audio-levels.js`: shared effect file peak (guarded in
both directions), clipping, DC offset, silent edges, per-track BGM gain, effective peaks, the
worst-case simultaneous sum, and the absence of native audio-session configuration.

To inspect any audio file directly: `npm run audio:levels -- Asset/audio/coin.wav`.
After replacing a BGM file: `npm run audio:gain`. After changing any audio asset, bump `CACHE` in
`sw.js` — audio is served cache-first and existing installs otherwise keep the old files.

Levels are a recording requirement, not a preference. See AUDIO_MIGRATION.md for why, and change
`scripts/audio-levels.js` rather than the literals in `html-audio.js`.

## On an iPhone

Coin-pickup regression: effects now start immediately or are discarded, with
one effect active across all sound types. BGM continues separately. Check long
coin chains and coin/orb/fever combinations: sounds must not overlap or replay
later, while rewards and visual effects continue. Desktop tests verify the
one-effect limit and immediate calls, not iPhone output latency or frame pacing.
Check both with and without screen recording. Pause/exit must stop all effects;
death and clear must still play their own cue after stopping gameplay audio.

Check portrait-device landscape overlays, long gameplay frame pacing, and background/resume.
Then record via Control Center with the microphone **OFF**, in three modes: BGM only, effects only,
both enabled. Judge from the recording, not the live speaker output.

- long coin chain with overlapping orb and fever — dropouts, and frame hitching on collection
- death and clear immediately after a chain
- mid-track continue, practice checkpoint, paid continue
- background → foreground, and stage change
- silent switch ON — the game is expected to be silent
- Bluetooth connect/disconnect, interrupting call
- audio-OFF persistence across relaunch

### Image sharpness and judder (A/B on the device, one at a time)

Both are URL switches, so a phone can be A/B'd with no debugger and no rebuild.
Safari on iOS cannot run console JavaScript without a Mac attached, which is why
none of this needs a console. Change one thing at a time.

    ?perf=1                    overlay on
    ?perf=1&dpr=1.5            previous soft image
    ?perf=1&dpr=2              current sharpness
    ?perf=1&clock=raw          raw media clock
    ?perf=1&clock=smoothed     current, smoothed

A URL value wins over the stored setting, so the same link always produces the
same condition. `perfHud.on()`, `localStorage.setItem('rdash_dpr_cap', ...)` and
`gameAudio.setClockSmoothing(...)` still work where a console is available.

### Reading frame numbers off the device

Desktop Chromium renders this game at 60fps with draw() around 0.3ms, so judder
reported from an iPhone cannot be reproduced or diagnosed here. Turn on the
on-device overlay instead and report the numbers:

    perfHud.on()       // persists across reloads; perfHud.off() to stop
    perfHud.reset()    // at the start of each measured run
    perfHud.report()   // session + last window, for copy-paste

Or append ?perf=1 to the URL. Rows: fps, frame interval p50/p95/worst, time
inside draw(), intervals over 33ms, frames where the drawn song position did not
advance, and the canvas size with the DPR cap in use.

report() covers the whole session since reset, not just the visible window.
Judder is intermittent, so the session worst is the number that matters: a run
can show frameMax 19ms in the live window while frameWorst for the session is
63ms. Call reset() when a run starts and report() when it ends; no polling loop
is needed.

Reading it:
- drop high, draw low  -> compositing or the audio pipeline, not game JavaScript
- draw high            -> game JavaScript
- pos high, frame flat -> the media clock, not rendering

The DPR cap trades sharpness against fill rate. Measured in Chromium at an
iPhone-like scale factor: with CPU headroom both 1.5 and 2 hold 60fps, and only
under 4x CPU throttling did cap 2 fall behind (36fps vs 56fps). Screen recording
itself adds load, so judge the cap while recording, not only in normal play.

An Xcode build and these device checks require macOS/iPhone; Capacitor sync and browser tests alone
do not certify them. Desktop Chromium does not reproduce mobile WebView media behaviour.
