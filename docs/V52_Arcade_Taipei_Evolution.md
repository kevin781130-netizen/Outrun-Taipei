# V52 Arcade Taipei Evolution

TAIPEI IS THE GAME. ARCADE IS THE PRESENTATION LANGUAGE.

## Evidence statement (clean-room honesty)

`orunners.zip` contains raw ROM chip images only (no emulator, no playable build) and was unpacked outside the repository, then deleted. Nothing was observed running.

- OBSERVED: only the archive file list (chip files, no runnable build).
- NOT VERIFIED: any specific handling, camera, timing or rendering behaviour of the reference title.
- INFERRED: genre-level design principles of 1990s large-cabinet highway racers (countdown pressure, road-side cadence, short failure interruption, readable hazards). They are used as hypotheses, not as measurements.

No ROM, sprite, palette, font, audio, table or code from the reference is in the repository. `tests/clean-room-compliance.cjs` is unchanged except for the visible build label.

## Baseline (kept as-is)

KEEP EXISTING: physics/presentation yaw split, curve-bound sideways drift, drift charge + nitro at once, nitro surge vs. slow natural build above 100 km/h, 15-route reality audit and landmark audit, visible-only collision rules, clipping/water guards, V50 comfort limits, Twin Link, audio lifecycle, 15-route screenshot smoke.

## Gap matrix (condensed)

| Dimension | Current state | Gap | Decision | Priority |
|---|---|---|---|---|
| Crash flow | 4.1 s ejection, restart at 75 km/h, timer keeps running | long interruption, slow re-entry | ADAPT (shorter, stronger re-entry) | P1 |
| Stage pacing | checkpoint appears with no anticipation | no tension ramp, no decision cue | ADAPT (distance boards) | P1 |
| Checkpoint presentation | small text pop only | weak emotional peak | ADAPT (gold flash + bilingual title) | P2 |
| Audio pacing | no cue when approaching goal | silent anticipation | ADAPT (board pass-by tick) | P2 |
| Nitro, drift, steering | already layered and tested | none worth risking | KEEP | - |
| Roadside cadence | world-anchored props by stride | cannot be judged without side-by-side frames | KEEP (not verified) | - |

## Changes

### 1. Shorter crash interruption (competitive change)
- Problem: a 4.1 s ejection scene plus a 75 km/h restart cost a whole straight of timer.
- Taipei adaptation: the 珍奶 chase gag is kept; its animation clock is compressed (`crashAnimScale`) instead of cut.
- Implementation: `V52_FLOW.crashDuration=2.9`, `recoverySpeed=96`, `recoveryGrace=1.6`; `crashSequence.anim` drives poses and chase text.
- Metric: regression drives a real crash through `update()` and requires recovery in 2.7-3.1 s at exactly `recoverySpeed`.
- Risk: easier to recover from crashes. No auto-steering, no rail assist (`autoRailAssist:false`).

### 2. Taiwan-highway approach boards (visual + pacing)
- Green 指示牌 "檢查站 CHECK POINT 500/300/100 M" (終點 GOAL in the last stage, solo FINISH/LOOP) on the right shoulder.
- Placed from the real distance (`SEGMENT_METERS`) before the target; skipped once the checkpoint is passed; world-anchored and scaled by projection, clipped by the existing `clipY` pass.
- A short original synth tick plays when a board is passed.

### 3. Checkpoint feel
- Warm gold flash (not white, not neon) and a bilingual title "檢查站通過 CHECK POINT". No camera swing added.

## Rejected / not adopted
- Larger camera motion or roll for speed: rejected (V50 comfort limits, motion sickness).
- Extra speed lines or new neon layers: rejected (readability over noise; speed should come from world flow).
- Reference-style HUD, route map or title composition: rejected (originality).
- More landmarks per route: rejected (Taipei theme-park risk).
- Retuning acceleration, steering, drift, nitro: deferred; no measurement showed a defect and handling changes need their own competitive review.

## Versioning
Crash duration and re-entry speed change run timing, so `COMPETITION.version` moves 51.0 to 52.0. Record keys already embed this value, so V51 times are not mixed with V52 times. Build label `V52.0`, package 52.0.0.

## Tests
- `tests/scenarios.cjs`: V52 flow constants, record namespace, real crash recovery timing and speed, compressed chase clock, 3 boards x 15 routes x 3 modes ordering, pass tick, finite sign projection on 4 routes, gold checkpoint flash.
- Label checks updated in `tests/browser-smoke.cjs` and `tests/clean-room-compliance.cjs` (guards not weakened).

## Remaining weaknesses / next candidates
1. Needs side-by-side playtest of corner-type differentiation (shallow/medium/tight) and straight-section decisions.
2. Traffic overtaking reward and near-miss feedback depth.
3. Per-route roadside prop vocabulary differences remain mostly visual-family based.
4. Stage-start and finish presentation cards could gain more cabinet-style staging.
5. Reference comparison should be repeated once a playable capture is available.
