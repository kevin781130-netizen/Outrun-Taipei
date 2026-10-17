# V59 — Arcade racing reference pass 01: uninterrupted route drift

## Scope
Legacy Stable **bug fix only**. Unity Primary remains the preferred path for
new major gameplay systems; the existing browser entry point is unchanged.

## Source review
The `bobeff/open-source-games` catalog is an index, not a single racing
codebase. Three listed source projects inform a **design-level** comparison:

| Open-source reference | Relevant architecture/idea | Outrun-Taipei fit |
| --- | --- | --- |
| [SuperTuxKart](https://github.com/supertuxkart/stk-code), `src/karts/skidding.cpp` | Distinct drift state, visual rotation, deterministic save/restore | High: preserve driving state independently of scene changes |
| [VDrift](https://github.com/VDrift/vdrift), `docs/Drift_scoring.md` | Drift validity measured using speed and angular slip | Medium: future telemetry/skill scoring, not simulation replacement |
| [wipEout Rewrite](https://github.com/phoboslab/wipeout-rewrite), `src/wipeout/camera.c` | Camera position and velocity smoothing | Medium: future cinematic camera, isolate from collision logic |

SuperTuxKart and VDrift include GPL-licensed source. Their implementations
were **not copied** into this patch. Reference material is used only to identify
portable general design concepts; independent logic is retained.

## Verified root cause (source inspection)
`setStage(..., preserveLane=true)` already skips `resetDrivingState()` for
the outgoing stage, but `finishStageTransition()` immediately called
`resetDrivingState()` afterwards. That zeroed body yaw, slip, lateral velocity,
drift combo progress, and boost transient state regardless of player input.

## V59 intervention
Remove only that trailing reset. Keep the existing roadway-coordinate mapping
and lane clamp. Preserve existing scripted resets for new race, new manually
selected stage, and crashes. No changes to drift parameters, scoring,
nitro economy, vehicle geometry, landmarks, or route geometry.

## Regression gate
`node tests/v59-stage-drift-continuity.cjs`
- Check left and right transition while mid-drift.
- Assert continuous slip, body angle, momentum, charge/boost, and speed.
- Assert stage/route/position update and transition clears.
- Assert `resetGame()` still clears dynamic drift state.

## QA limits
Do not claim gameplay/browser/visual QA until `npm test` and browser tests
run on this exact branch. This change does not deploy or replace Legacy Stable.
Future work: instrument corner quality/feel with deterministic traces before
calibrating any handling or designing a parallel Unity vehicle controller.
