# Gameplay fixes and remaining validation

## Implemented

- Coin settlement tracks the already-paid amount across death, revive and clear; repeated clear is ignored.
- Notes, orbs and near-miss rewards cannot be claimed twice on rewind. Expired notes break combo, including during invincibility.
- Practice mode may only change before a run.
- Pause freezes music and simulation; resuming has a countdown and does not consume another daily attempt. Actual background/pagehide events pause automatically. Visible frame stalls and focus changes do not pause; dropped frames use bounded physics substeps synchronized to the music position. Touch-device canvas pixel ratio is capped at 1.5 to reduce rendering cost.
- Normal and SUN high scores, ranks and ghosts use separate `rdash_v2_*` keys. Prior keys remain untouched as legacy records; progress, coins and unlocked characters remain unchanged. Event best uses bestV2; old event best remains stored.
- Result details show accuracy, judgement counts and SUN activation count/active seconds in a landscape-aligned overlay. No fever-completion points/coins toast is shown.
- Dark panels, readable unlock conditions, purchase confirmation and reduced-effects setting.
- Official PNGs remain unchanged. Next fever art is requested as the gauge charges; failed images do not stop gameplay.

## Not yet validated / intentionally unchanged

- All 20 stages need real playtesting for difficulty, timing and obstacle feasibility. No arbitrary fever duration or stage difficulty changes have been made before measurement.
- iOS native audio interruption/resume and Bluetooth latency require real-device testing. Pause uses the existing backend seek/play API.
- Interactive first-run tutorial remains a follow-up; the help panel now explains orbs, flip and mode-specific fever.
- Collaboration end date remains unspecified and must be provided before timed release.
- Offline licensed image availability remains subject to the existing no-runtime-cache policy; no new artwork cache was added.

## Automated coverage

`scripts/test-collaboration.js`: gauge, seven-artwork cycle, continuous play, invincibility, coin multiplier, disabled collaboration, local font, pause/resume, one-time coin settlement, duplicate note judgement, duplicate clear protection, missed-note combo break, separated score keys.
