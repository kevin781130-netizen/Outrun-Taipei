# V59.1 — Drift continuity at district handoff

## Confirmed root cause

At the end of the 160-segment fork merge, `finishStageTransition()` called
`setStage(..., preserveLane=true)`, then **unconditionally called
`resetDrivingState()`**. That erased the actual steering, slip angle, drift
state, lateral velocity, exit boost, and wheel-trail history exactly at the
route switch. `setStage()` also forced `roadGrip=1` despite preserveLane.

## Change

- Remove the second, unconditional reset in `finishStageTransition()`.
- Respect `preserveLane` when initializing `roadGrip`.
- Keep the existing lane bounds, route lengths, data, scoring, speed, nitro and
  drift model untouched.
- Add eight handoff regression probes: every one of the four arcade-stage joins
  and both branch directions, asserting existing handling and nitro state are
  preserved. Retain separate fresh-start reset behavior.

## Deliberate limits

This change fixes the **deterministic control-state cut**. It does *not* claim
to eliminate a separate frame hitch when landmark meshes/signs are rebuilt by
`src/rendering/Full3DScene.cjs` and `TaipeiLandmarks.cjs`. Actual WebGL
visual/performance acceptance requires playing a deployment built from this PR.
No assets or algorithms were copied from third-party experiments or game ROMs.
