# Gameplay fixes and remaining validation

## Implemented

- Coin settlement tracks the already-paid amount across death, revive and clear; repeated clear is ignored.
- Notes, orbs and near-miss rewards cannot be claimed twice on rewind. Expired notes break combo, including during invincibility.
- A judged note never takes a jump meant for the next note (an early jump right after a judged note is judged against the next one).
- A shield or the post-revive grace keeps the whole step running while the player overlaps an obstacle: coins, effects and the clear check continue.
- Walking off any ledge starts a fall, including from a tall block onto a lower one.
- Pause freezes music and simulation; resuming has a countdown and does not consume another daily attempt. Actual background/pagehide events pause automatically. Visible frame stalls and focus changes do not pause; dropped frames use bounded physics substeps synchronized to the music position. The canvas backing-store pixel ratio is capped at 2 (`rdash_dpr_cap` / `?dpr=` override for device A/B).
- High scores and ranks use the `rdash_v2_*` keys. Ghost runs were recorded but never drawn, so recording was removed and the stored `rdash_v3beat_*_ghost_*` entries are deleted once on startup. Progress, coins and unlocked characters are unchanged.
- Result details show accuracy and judgement counts in a landscape-aligned overlay.
- Dark panels, readable unlock conditions, purchase confirmation and reduced-effects setting.
- Stage lengths rise gradually: stages 1-10 use the 23-31s songs; stages 11-18 end on the strongest beat near 45, 60, 75, 90, 105, 115, 125 and 135s; stages 19-20 play the whole song (137s, 180s). Targets are `STAGE_LENGTHS` in index.html. High scores recorded on the earlier full-length versions of stages 11-18 are kept as they are.
- Obstacle types are defined in one table (`OBSTACLES` in index.html): geometry, unlock difficulty, spacing, coin placement and near-miss scoring. Charts and geometry are byte-identical to the previous per-site definitions.
- Menu refresh extensions register with `gameUI.onRefresh(fn)` instead of wrapping `gameUI.refresh`.

- Stage gimmicks (stages 3-4, 7-12, 15-20) are described in STAGE-GIMMICKS.md. Charts keep a jump's length between obstacles (0.5s, 0.58s before a wide one), keep 0.75s clear after a flip portal, and a tap is buffered for 0.15s (`JUMP_BUFFER`); before this, a few spots in stages 6+ could not be cleared by tapping on the beat.

## Switched off

- FEVER / POWER (coins charge a meter; ten seconds of double score/coins and protection) is off. The single switch is `ENABLED` in `cosmii-power.js`; while it is false the meter is hidden, coins keep their ordinary value and `activateFever()` does nothing. Turning it on restores the feature without other edits.
- Practice mode is used only by the live tutorial (reward-free runs). The old 25% practice checkpoints had no way to be enabled and were removed.

## Performance

- Per frame the canvas draws only small pre-cut images: HUD panel, gauge, judgement words, start text and coin are cut from their sheets at load, sized to the screen scale (re-cut when it changes), and the panel colour grade is baked in instead of using `ctx.filter`.
- The HUD reads layout once per size change, the scenery DOM is written only when it moves, and the character reaction labels are pre-rendered.
- `scripts/test-frame-cost.js` guards these (no `ctx.filter`, no large source images per frame, no per-frame layout reads).

## Not yet validated

- All 20 stages need real playtesting for difficulty, timing and obstacle feasibility, including the new stage lengths.
- iOS native audio interruption/resume and Bluetooth latency require real-device testing. Pause uses the existing backend seek/play API.
- Frame pacing on device: run with `?perf=1` and compare jump/coin frames with ordinary frames.

## Automated coverage

- `scripts/test-cosmii-power.js`: with FEVER off, coins keep their value, the meter stays hidden and a collision still ends the run.
- `scripts/test-frame-cost.js`: per-frame drawing cost, protected overlap, next-note judgement, ledge fall.
- `scripts/test-obstacle-patterns.js`: safe jump paths for every new obstacle, progressive unlocks and gradual stage lengths.
- `scripts/test-stage-gimmicks.js`: all 20 stages clear when tapping on the beat; gimmick stages with several characters and press lengths; wrong gimmick choices fail.
