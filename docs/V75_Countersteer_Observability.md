# V75 — Real S-curve countersteer observability

## Why
V74's original, successful Chromium artifact had 4 real browser scenarios:
**4D and 5C, each with V68 and V69**. The actual 3D browser simulation
executed the two opposite-sign bends continuously, with separate keyboard
drift/countersteer. In all four runs, the V71 metric counted **0 completed
0.42-second neutral-steer exit windows**. This is not evidence that exit
handling failed: the V71 metric excludes active steering and interrupted
windows, precisely what makes continuous S-curve inputs different.

V75 measures those otherwise invisible driving events rather than lowering
V71's qualification thresholds or silently making drift assistance stronger.

## Instrumentation (diagnostic scripts only)
- Extends `tests/v74-s-curve-browser.cjs` to read **real 60 Hz browser game
  frames**: road curvature, position, speed, filtered steering, lateral
  velocity, yaw, grip, drifting/recover/grip FSM state and settle/exit-window
  status. Does not inject any hooks into the actual game source or change
  player keyboard events.
- Separately stores each phase's precise start/end frame boundaries. The
  pure `tests/v75-countersteer-metrics.cjs` analyzer derives:
  - **Countersteer response frame:** first sample in which the filtered
    steering is aligned with the player's reversed key and |steer| ≥ 0.12.
  - **Recover and grip frames:** first recover/grip state within each actual
    countersteer phase, including right-censored `null` when not observed.
  - **Recovery → grip transitions** across the entire run, recording whether
    steering was neutral at the transition (without assuming that an entire
    subsequent 0.42-second window completed).
  - Signed lane displacement, peak |lateral velocity|, peak yaw, road-grip
    minimum, speed delta and frames spent in active drift. Units are those
    of the existing game's internal simulation; metrics are descriptive.
- Produces `test-results/v74-s-curve-browser/v75-countersteer-observations.json`
  beside V74's verified screenshots, with each mode/route's source trace
  analyzed by identical code.
- `tests/v75-countersteer-metrics-test.cjs` checks event classification,
  countersteering in both directions, censored events, malformed frames
  and strict phase continuity in `npm test`.

## Interpretation rules
The four V68/V69 scripted runs provide **controlled keyboard commands on
two real authored routes**, not random human playthroughs. Comparing the
resulting metrics is evidence of observable response under these specific
conditions, not an objective proof of comfort, fairness or optimal handling.
There is no reason to expect a V71 neutral-exit window in every S-curve.
Do not score zero qualifying windows as a failure, nor relax safety gates
simply to make a graph more populated.

## Scope / quality gates
- V75 branch `test/v75-countersteer-observability` is stacked on V74.
- Source `index.html`, the physics functions, scoring, nitro, route layout,
  visuals and competition namespace `61.0` are **unchanged**.
- Only test files, test runner and documentation change. Legacy official
  page, approved V60 and V61–V71 previews remain untouched.
- `npm test` + `npm run test:browser` must both pass before reporting
  V75 as verified. Screenshot creation is not deployed visual sign-off.
- Larger new game systems should follow the Unity Primary track of the
  repository constitution.
