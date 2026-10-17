# V72 — Matched-condition post-drift replay (headless diagnostic)

## Goal
V71's real-driving V68/V69 exit metrics are observational: two different
player attempts are not guaranteed to have identical steering or road state.
V72 adds an automated **matched starting-state / matched input** replay so
future changes can be compared reproducibly, without another speculative
physics adjustment.

## Method
- Runs the existing `stepBrakeDrift` authentic `recover → grip` transition
  and `stepArcadeMotion` from the current production HTML in the standard
  project test VM. It **does not** reimplement those handling equations.
- Covers all 15 authored Taipei routes at 175 km/h, with mirrored initial
  lateral velocity ±0.85; adds 125 and 245 km/h cases for 1A, 4B and 5C:
  **42 condition pairs** (84 physics runs).
- Each pair starts at the same road segment, identical player position, speed,
  slip/yaw, lateral velocity, road grip, and driver control (forward, throttle
  held, steering neutral, brake off). Uses 26 fixed 1/60-second physics ticks,
  including the complete V71 0.42-second telemetry window.
- At every tick checks identical road curvature, speed and longitudinal
  progress for both variants. Lateral velocity / displacement may legitimately
  differ, as **only V69's post-exit stabilizer** is switched.
- Replays the entire experiment twice and asserts an identical result,
  retaining the V71 qualified mean/peak |lateral velocity| as evidence.
- Verifies no modification of scores, nitro, stock, or
  `COMPETITION.version='61.0'`; archives structured measurements as
  `test-results/v72-paired-exit-replay.json`, available as a CI artifact.

## Limits
These are **controlled synthetic starting states**, not recorded input from
human players or verified 3D visual gameplay. They isolate and measure the
physics delta under a constant control sequence; they **do not establish**
whether either handling mode is more fun, realistic or objectively superior.
The replay uses real route curvature and longitudinal movement, but not all
of the full game's traffic/collision/audio/timing loop. No new in-game
replay control, automated steering or matchmaking is shipped.

## Preservation and next gate
- Source track: **Legacy Stable diagnostic** only, aligned with the V71 lab.
  No changes to `index.html`, scoring, routes, physics, leaderboard, renderer,
  stage network or the original deployed game.
- Stacked development branch `feat/v72-paired-drift-replay` on
  `feat/v71-drift-exit-lab`. Main and all published V60–V71 URLs untouched.
- `npm test` now includes the V72 replay test. `npm run test:browser`
  remains a release gate; no new public preview required because this
  increment only creates diagnostics/tests.
- Future game systems should follow the repo's Unity Primary migration policy.
