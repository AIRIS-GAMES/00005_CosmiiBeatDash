# HTML audio

## Reference and scope

Read-only reference: `C:/MyWork/startup/00010_CosmiiCannon/www/index.html`, audio section around lines 3483–3575. It uses file-backed media elements and pause → rewind → play for effects. The reference project was not changed.

That pattern was copied without comparing scale. This game fires effects far more often than the reference: beat maps reach 16–22 onsets per second, and the coin generator places pairs 0.12–0.18 s apart, so a pause → rewind → play on every hit lands repeatedly inside single frames. Effects now play from a pool instead; see *Playback*.

Before migration: this game's BGM used a native player on iOS, browser decoded-buffer playback on web, and an HTML fallback. Effects were generated during play. AppDelegate and the native plugin both set a mixing audio session. All those alternate paths are removed, including the native Swift file, Xcode source reference and post-sync registration script.

## Playback inventory

| Entry | Calls / purpose | Replacement |
|---|---|---|
| ensureAudio | stage selection, first input, resume | media gesture unlock, every pooled voice |
| playTrack | new attempt, practice checkpoint, paid continue, pause resume | single HTML BGM, seek by original track time |
| stopMusic | stage exit, death, clear, pause, next attempt | pause BGM and all effect voices |
| sfxDeath | death | death.wav / gain 0.45 |
| sfxClear | stage clear | clear.wav / gain 0.50 |
| sfxCoin | coin pickup, paid continue | silent; no media element |
| sfxOrb | air orb | orb.wav / gain 0.45 |
| sfxFever | fever activation | fever.wav / gain 0.50 |

Existing sound envelopes, pitches and durations are approximated in pre-generated WAVs, not generated at runtime.

## Output levels

Screen recording is a product requirement (store video, SNS, streaming). Screen recording taps the app mix **before** hardware volume, so raising the device volume does not raise the recorded signal. A quiet mix records its own noise floor, and amplifying it on playback lifts the codec noise with it — it sounds fine on the speaker and broken in the recording.

Full scale 1.0 = 0 dBFS. **Effective peak = file peak × playback gain**; neither number means anything alone.

| | file peak | gain | effective |
|---|---|---|---|
| BGM (all 7 tracks) | 0.445–0.609 | per track, 0.232–0.318 | **−17.00 dBFS** |
| clear, fever | 0.510 | 0.50 | **−11.87 dBFS** |
| orb, death | 0.510 | 0.45 | **−12.78 dBFS** |
| coin | 0.510 | 0.40 | **−13.81 dBFS** |

Worst case, peaks aligned: BGM + the single loudest effect = **0.3962**, under the 0.9 working ceiling. Individual file peaks and playback gains are unchanged.

Two rules hold this together:

- **All five effect files share one peak.** Relative balance is playback gain only, so the mix can be rebalanced by editing `SFX_GAIN` in `html-audio.js` — no file is regenerated.
- **Every BGM track carries its own gain**, measured from the file that actually ships and stored in `Asset/audio/tracks.js`. The masters differ by 2.7 dB; without this, stage 2 was audibly louder than stage 1. `setMusicTrack()` applies the source and its gain together, so the two can never be set independently.

The BGM playback copies keep their 60 % offline attenuation. That was introduced as headroom against devices that constrain element volume control, and it still serves that purpose: if element volume were ignored entirely, BGM would play at −4.3 dBFS rather than clipping. The per-track gain compensates for it at the element.

**Previous levels, for reference:** effects were normalised to a 0.10 file peak and BGM played at a fixed element volume of 0.20. That put effects at −28.3…−26.0 dBFS and BGM at −21.0…−18.3 dBFS — 14–17 dB below target for effects, and at or under the −20 dBFS floor where recording quality visibly degrades.

There is no compressor or limiter on the master. The level design makes one unnecessary, and one would pump on the effect transients.

## Playback

`html-audio.js` owns one BGM element and one voice for each of the four enabled effects (orb, fever, death, clear). Only one effect may play at a time, including the period while its `play()` promise is pending. BGM continues separately.

- **Start now or drop.** The deferred timer was removed after reported pickup delay. An accepted effect calls `play()` immediately; there is no application replay queue. Browser/media output latency still requires device measurement. Rewinding happens in the `ended` handler.
- **Preload is staged.** Only `orb` uses `preload="auto"`; other effects use `preload="none"`. Coin has zero voices and is not preloaded or gesture-unlocked.
- **At most one effect sounds at once**, across all types. While any effect is busy, new requests are discarded, without interruption, rewind, or later replay. Death/clear retain their explicit stop-before-cue lifecycle.
- **Coin pickups are silent.** Scoring and visuals are unchanged. `sfxCoin()` is a no-op and the coin pool has zero voices, so neither pickups nor paid continues perform coin media work. The WAV source is retained for asset tooling.
- **A repeat of the same effect inside 100 ms is dropped.** The closest designed coin pair is 0.12 s apart, so the guard never eats a designed pair. An explicit stop (stage exit, death, clear, backgrounding) clears the guard.
- **Gesture unlock is per element**: the first gesture plays and immediately stops every pooled voice muted.
- A `play()` cut short by a later `pause()` rejects with `AbortError`. That is the documented behaviour of the steal path and is excluded from error reporting.

Beat maps use the prior energy/onset algorithm at 48 kHz, generated offline. Existing per-track `rdash_bc1_*` caches remain readable; no progress, coin, score or unlock keys are migrated or deleted.

The BGM copies have a 0.9-second silent lead-in; the game clock subtracts it, and resume/continue seeks include it. The clock follows media `currentTime`, so buffering does not silently advance the level.

## Native audio session

**AppDelegate does not configure `AVAudioSession`, deliberately.** WebKit manages the session itself; an app-side setting is overwritten later, and the conflict distorts screen-recording audio. `.mixWithOthers` in particular marks the audio non-primary and removes it from Control Center screen recording entirely, BGM included.

The consequence is that the iOS silent switch mutes the game. Recording quality was chosen over silent-switch audibility on 2026-09-16, and that is the current requirement. `scripts/test-audio-levels.js` fails if audio-session configuration reappears in `ios/`; it inspects code lines only, so comments may still name it.

## Settings

Audio-only preferences are saved at `rdash_audio_prefs` as `{music, sound}` booleans. There is no settings UI; the keys and value shape are deliberately unchanged. They can be set from Web Inspector:

```js
gameAudio.setSettings({music:true, sound:false}); // BGM only
gameAudio.setSettings({music:false, sound:true}); // SFX only
gameAudio.setSettings({music:true, sound:true});  // both
gameAudio.setSettings({music:false, sound:false}); // both off, persists
```

Music OFF mutes the single media element while preserving the rhythm clock. It does not start a separate silent music player.

`gameAudio.levels()` reports the live gains, pool depths, concurrency limit and retrigger interval. `gameAudio.inspect()` returns the BGM element and each effect's voice array.

## Lifecycle

`visibilitychange` and `pagehide` stop all audio and hand over to the existing pause/countdown UI. BGM intent is separate from playback: it restarts only from the pause panel, at the preserved position, guarded by `playbackGeneration` so it cannot double-play. Short effects are not replayed on return. `pageshow` re-pauses BGM if the back/forward cache restored a playing element while the game is not in play state.

## Rebuild and validation

- Effects only, no ffmpeg needed: `node scripts/generate-audio-assets.js --sfx-only`.
- Everything, including BGM re-encode and beat maps: set `FFMPEG` to an ffmpeg executable with MP3 support and run `node scripts/generate-audio-assets.js`.
- After replacing any BGM file without ffmpeg: `npm run audio:gain` re-measures each track in headless Chromium and rewrites the gains in `tracks.js`.
- `npm run audio:levels <file>...` prints peak, RMS, clipped samples, DC offset, largest adjacent-sample step and edge samples for any audio file, decoding through Chromium so compressed sources work without ffmpeg.
- Level and budget numbers live in `scripts/audio-levels.js` and nowhere else. `html-audio.js` repeats the gains as browser literals; `scripts/test-audio-levels.js` fails if the two drift.
- Generated assets are committed inputs to normal builds; users do not need ffmpeg to build.
- `npm run cap:sync:ios` builds `www` from source and runs Capacitor sync to `ios/App/App/public`. Never edit either generated directory directly.
- **Bump `CACHE` in `sw.js` whenever an audio asset changes.** The audio files are served cache-first; without a bump, existing installs keep the old ones indefinitely. Currently `rdash-v45-audio-levels`.

## What the tests cover, and what they cannot

`npm test` covers, on desktop Chromium:

- effect file peaks against the shared value, guarded in **both** directions — too quiet is a defect that only a test catches
- clipped-sample count, DC offset, and first/last sample at zero
- effective peaks per sound, the BGM per-track effective peak, and the worst-case sum, all computed from the files that ship
- runtime gains, pool depths, concurrency limit and retrigger interval matching `scripts/audio-levels.js`
- immediate `play()`-only starts, a global one-effect limit, and no delayed replay of discarded requests
- concurrency cap, retrigger guard, BGM singleton and position preservation
- settings persistence across reload, and background → foreground ordering
- absence of native audio-session configuration

None of that certifies the device. Only an iPhone shows recording quality, perceived frame pacing, speaker timbre, silent-switch behaviour and BGM-versus-effect balance. On macOS, build in Xcode and then on iPhone record via Control Center with the microphone **OFF**, in all three settings (BGM only, effects only, both):

1. A long coin chain and overlapping orb/fever — listen for dropouts and for frame hitching on collection.
2. Death and clear, each immediately after a chain.
3. Mid-track continue, practice checkpoint, and paid continue.
4. Background → foreground, and stage change.
5. Silent switch ON — expect silence; confirm that is still acceptable.
6. Bluetooth connect/disconnect and an interrupting call.
7. Audio-OFF persistence across a relaunch.

Judge from the recording itself, not the live speaker output. Compare against a recording of the previous build: effects are now 14–17 dB louder in absolute terms and about 5 dB above BGM rather than 7 dB below it, which is the intended change but is large enough to want a listen before release.
