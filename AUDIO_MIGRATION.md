# HTML audio migration

## Reference and scope

Read-only reference: `C:/MyWork/startup/00010_CosmiiCannon/www/index.html`, audio section around lines 3483–3575. This is the existing directory corresponding to the supplied reference path. It uses file-backed media elements and pause → rewind → play for effects. The reference project was not changed.

Before migration: this game's BGM used a native player on iOS, browser decoded-buffer playback on web, and an HTML fallback. Effects were generated during play. AppDelegate and the native plugin both set a mixing audio session. All those alternate paths are removed, including the native Swift file, Xcode source reference and post-sync registration script.

## Playback inventory

| Entry | Calls / purpose | Replacement |
|---|---|---|
| ensureAudio | stage selection, first input, resume | media gesture unlock |
| playTrack | new attempt, practice checkpoint, paid continue, pause resume | single HTML BGM, seek by original track time |
| stopMusic | stage exit, death, clear, pause, next attempt | pause BGM and all effects |
| sfxDeath | death | death.wav / 0.45 |
| sfxClear | stage clear | clear.wav / 0.50 |
| sfxCoin | coin pickup, paid continue | coin.wav / 0.40 |
| sfxOrb | air orb | orb.wav / 0.45 |
| sfxFever | fever activation | fever.wav / 0.50 |

`html-audio.js` owns one BGM element (volume **0.20**) and five reusable effect elements. Each effect pauses, rewinds to zero, then plays. At most three effect types can sound concurrently. Existing sound envelopes, pitches and durations are approximated in pre-generated WAVs, not generated at runtime.

To retain headroom even on devices that constrain element volume control, playback copies of BGM are attenuated to 60% offline and WAV effects have a 0.10 peak ceiling. Original MP3 files remain unchanged. The copies have a 0.9-second silent lead-in; the game clock subtracts it, and resume/continue seeks include it. The clock follows media currentTime, so buffering does not silently advance the level.

Beat maps use the prior energy/onset algorithm at 48kHz, generated offline. Existing per-track `rdash_bc1_*` caches remain readable; no progress, coin, score or unlock keys are migrated or deleted in this change.

## Settings and recording conditions

This checkout had no BGM/SFX preference controls or corresponding save keys. No unrelated UI was added. New audio-only preferences are saved at `rdash_audio_prefs`. They can be set using Web Inspector:

```js
gameAudio.setSettings({music:true, sound:false}); // BGM only
gameAudio.setSettings({music:false, sound:true}); // SFX only
gameAudio.setSettings({music:true, sound:true});  // both
gameAudio.setSettings({music:false, sound:false}); // both off, persists
```

Music OFF mutes the single media element while preserving the rhythm clock. It does not start a separate silent music player. Visibility/pagehide stops all audio and uses the existing pause/countdown UI to resume; short effects are not replayed on return.

## Rebuild and validation

- To regenerate audio assets: set `FFMPEG` to an ffmpeg executable and run `node scripts/generate-audio-assets.js`. Generated assets are committed inputs to normal builds; users do not need ffmpeg to build.
- `npm run cap:sync:ios` builds `www` from source and runs Capacitor sync to `ios/App/App/public`. Never edit either generated directory directly.
- Run `scripts/test-collaboration.js` and `scripts/test-html-audio.js` with Playwright available via `TEST_PLAYWRIGHT_MODULE`.
- Local preview and the service worker handle byte ranges for seeking, including cached media.

Windows validation cannot run Xcode or verify the iPhone recording mixer. On macOS run the iOS Xcode build, then on iPhone record with Control Center microphone OFF for BGM only, SFX only, and both. Check repeated coins, overlapping fever/orb sounds, death/clear, mid-track continue, background/foreground and stage changes. Also check silent switch, Bluetooth interruptions and audio-OFF persistence. Compare the recording itself, not just live speaker output.
