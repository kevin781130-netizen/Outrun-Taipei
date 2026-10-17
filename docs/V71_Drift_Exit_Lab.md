# V71 — Drift Exit Lab: completed-window A/B telemetry

## Problem
V70's original whole-drive mean absolute lateral velocity mixes straights, turns,
reversals and different driver inputs. The low number can indicate fewer turns,
not better drift recovery. V71 **adds** a conditioned metric; it does not
reinterpret old statistics or introduce new steering assistance.

## What is measured
- An authentic `recover → grip` transition arms a **0.42-second** observation
  when the cruise-only lab is open, driving forward at ≥70 km/h, on road,
  with steering ≤0.12 magnitude.
- Samples run from the real physics path at the game's frame dt; their
  contributions are weighted by elapsed seconds. Only a fully completed,
  uninterrupted window increments a mode's **valid exits** count.
- Reports the mean of completed windows' mean |lateral velocity| and the
  highest peak |lateral velocity| observed within those windows.
- A sample is discarded (not counted) on new drifting, steering outside the
  neutral threshold, offroad, slowdown, crash, pause, reverse, mode/route
  change, closing lab or clearing stats. All are in-memory, constant size.
- V68 vs V69 still uses the **same V69-only post-exit A/B switch** added by V70.
  The `COMPETITION.version`, speed, score, Nitro, collision, stage and
  recovery logic are not changed.

## How to use
On the isolated V71 preview (when built), select 自由巡航, open 🔬 DRIFT LAB
with K and run multiple similar corners at similar speed with each model.
The **有效 0.42s 出彎** line compares qualified exits; the original
**全程** line remains visible but is explicitly labeled less specific.

**Limit:** these are *unpaired, player-driven observational samples*. Even a
completed-window mean does not demonstrate that one model is causally better.
Rigorous evidence would require repeated synchronized input and road-state
replays, ideally measured with player blind testing.

## Attribution / original code
The catalog at https://github.com/bobeff/open-source-games is a directory,
not a library to vendor. Studied
[SuperTuxKart skidding state handling](https://github.com/supertuxkart/stk-code/blob/master/src/karts/skidding.cpp)
for the high-level idea of making the skid lifecycle explicit and separating
presentation from physical steering. Our metric and all parameter values are
independently authored; no game code, assets, handling curves or data were copied.

## QA and release
- `node tests/v71-drift-exit-window.cjs`: authentic recovery transition,
  full-time A/B, neutral/cancel gates, clearing, score and Nitro integrity.
- `npm test` and `npm run test:browser` are release gates; rendered browser
  screenshots and real player feel still need independent acceptance.
- Branch `feat/v71-drift-exit-lab` stacked on V70 PR #46, isolated Draft.
- Legacy stable, all existing official Pages, all earlier preview builds and
  V60 approved checkpoints must remain unchanged.
- This is contained Legacy Stable diagnostic work. Large future game systems
  follow the Unity Primary parallel-migration policy.
