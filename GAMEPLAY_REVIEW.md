# Gameplay fixes and remaining validation

## Implemented

- Coin settlement tracks the already-paid amount across death, revive and clear; repeated clear is ignored.
- Notes, orbs and near-miss rewards cannot be claimed twice on rewind. Expired notes break combo, including during invincibility.
- Practice mode may only change before a run.
- Pause freezes music and simulation; resuming has a countdown and does not consume another daily attempt. Actual background/pagehide events pause automatically. Visible frame stalls and focus changes do not pause; dropped frames use bounded physics substeps synchronized to the music position. Touch-device canvas pixel ratio is capped at 1.5 to reduce rendering cost.
- High scores, ranks and ghosts use the normal `rdash_v2_*` keys. Prior keys remain untouched as legacy records; progress, coins and unlocked characters remain unchanged.
- Result details show accuracy, judgement counts and POWER activation count/active seconds in a landscape-aligned overlay. No fever-completion points/coins toast is shown.
- Dark panels, readable unlock conditions, purchase confirmation and reduced-effects setting.
- POWER charges from collected coins and activates for ten seconds after ten coins. During activation it doubles score and coins, protects the player, and displays a randomly selected Cosmiii.

## Not yet validated / intentionally unchanged

- All 20 stages need real playtesting for difficulty, timing and obstacle feasibility. No arbitrary fever duration or stage difficulty changes have been made before measurement.
- iOS native audio interruption/resume and Bluetooth latency require real-device testing. Pause uses the existing backend seek/play API.
- Interactive first-run tutorial remains a follow-up; the help panel now explains orbs, flip and the coin-powered ability.

## Automated coverage

`scripts/test-cosmii-power.js`: coin collection, random Cosmiii activation, invincibility, coin multiplier, and repeat activation.
