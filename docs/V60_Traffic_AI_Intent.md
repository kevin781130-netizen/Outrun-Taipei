# V60 Traffic AI intention — isolated clean-room development slice

Track: Shared game logic exploration for the Unity-primary migration.  
Branch: `feature/turbo-reimagined-cleanroom-20261015`  
Status: **pure module implemented and unit tested; NOT connected to live traffic simulation or WebGL.**

## Motivation / evidence boundary

The user-provided Turbo OutRun Reimagined v0.5 Unity archive has managed-assembly
identifiers that suggest AI lane changing, but no proprietary AI algorithm,
parameters, source code, assets or sounds are transplanted. The reference is a
behavioral research input, **not** a source-code license.

The Taipei V59 runtime currently moves AI traffic using a gentle sine-wave lane
target in `index.html`; it already protects traffic eligibility, fork geometry,
collision visibility, close-pass scoring, 15 routes and 27 landmarks.

This module adds original, deterministic **lane-change intention** only.
It has **no side effects**: no vehicle position writes, speed changes, scores,
nitro, player controls, game-clock changes, random-number calls or UI changes.

## API

`src/traffic/LaneIntent.cjs` exports `planLaneIntent(input)` and `RULES`.

The input specifies a vehicle's `x/z/speed/halfWidth`, nearby vehicle snapshots,
road corridor samples, player longitudinal position, fork-warning position,
opt-in flag and a caller-managed cooldown. Coordinates are in the existing
Taipei game world scale. On safe overtaking opportunities it returns
`{action:'change',target,cooldown,reason}`; otherwise returns
`{action:'hold',target,reason,cooldown:0}`.

Current policy, authored for Taipei:

- Never decide anything unless explicitly enabled.
- Require a slower vehicle directly ahead before attempting a pass.
- Check destination-lane forward and rear gaps, plus the immediate swept
  lateral path; block unsafe adjacent changes and avoid the nearby player.
- Refuse split-road geometry, narrow or invalid corridors, and pre-fork areas.
- Do not require vehicle IDs: existing traffic objects lack IDs.
- Deterministically evaluate both adjacent lanes without RNG.
- Return only a recommendation; **the caller** is responsible for enforcing
  cooldown, steering interpolation, visible-traffic constraints and rollback.

## Files / validation performed

- `src/traffic/LaneIntent.cjs`: original read-only decision function.
- `tests/v60-lane-intent.cjs`: verifies enabled/disabled behavior, safe
  overtaking, rear and front blockers, swept-path blockers, player buffer,
  road-width constraints, split forks, invalid state, repeated deterministic
  decisions and zero gameplay RNG calls / input mutations.
- `package.json`: appends the test to `npm test` and adds `npm run test:traffic-ai`.

The single-module Node.js test was **executed successfully** in isolation.
Full repository `npm test`, Chromium WebGL, visual deployment and actual
driving acceptance were **not executed** and must not be reported as passed.

## Future integration gate

Only after a separate explicit next step, add a simulation adapter that
constructs road corridor samples from `roadCorridors(index)` and world-geometry
`trafficHalfWidth(car)`, then enables the planner in a separately tagged
single-player preview mode. The default traffic update, replay fingerprints,
15 routes, 27 landmarks, collision eligibility, close-pass score, arcade
leaderboards and deployed Legacy Stable entry point must remain unchanged.

No claim of full reverse-engineering, Unity scene port, finished AI driving,
full game fusion or browser visual verification is made at this stage.
