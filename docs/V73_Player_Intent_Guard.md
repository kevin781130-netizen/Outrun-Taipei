# V73 — Player-intent protection and out-of-drift assessment

## Empirical V72 evidence (run 39056584334)
The artifact `game-browser-qa/v72-paired-exit-replay.json` from the
passing GitHub Actions run contains **42 matched neutral exit scenarios**.

|  | V68 | V69 |
| --- | ---: | ---: |
| Mean absolute lateral velocity (internal units/s) | 0.109150 | 0.078812 |
| Difference relative to V68 | — | **−27.79%** |
| Scenarios with lower absolute lateral velocity on V69 | — | **42/42** |

Across speeds: 125 km/h (6 scenarios): −31.98%; 175 km/h (30):
−28.26%; 245 km/h (6): −22.28%. These numbers are measured,
not manually selected physics constants.

**Interpretation restriction:** lower absolute lateral velocity is not
automatically better, particularly if lateral motion is the driver's desired
cornering direction. These measurements apply to controlled initial states
with 0 steering throughout each exit window and do not justify boosting the
V69 correction further, changing the scoring model, or merging stacked PRs.

## New V73 input non-interference gate
`tests/v73-driver-intent-guard.cjs` runs the original legacy game functions:

- **90 paired scenarios**: 15 authored routes × 125/175/245 km/h × both
  left/right inputs. Each simulates 26 × 1/60-second physics frames, active
  steering at magnitude 0.55, reversing direction halfway through.
  **V68 and V69 must produce exactly identical physical frame traces**
  while the driver's steering input is active.
- Directly calls the actual `v69ExitSettle` code while the window is armed
  under 30 neutral/active steering, initial lateral-velocity and road-target
  combinations, testing that neutral correction strictly decreases
  **target-relative** error and that active steering changes neither
  lateral velocity nor yaw. This protects against centering to lane 0.
- Additional offroad, reverse and recovery-state conditions cannot apply
  settle; arcade gameplay always forces V69.
- All 15 routes and modes preserve score, Nitro, existing record namespace
  `COMPETITION.version='61.0'`. The test report is emitted to
  `test-results/v73-driver-intent-guard.json` and automatically uploaded
  by the existing GitHub CI artifact step.

## Decision
**Do not change handling yet.** V72 supports improved neutral exit damping
within its measured conditions; V73 guards against strong player-command
interference. Neither substitutes for visible, hands-on evaluation of
drifting through genuine S-curves and fast countersteer transitions.

## Scope and release safeguards
- Diagnostic-only source branch `test/v73-driver-intent-guard`, stacked on
  `feat/v72-paired-drift-replay`. Main untouched.
- Only tests/package command/docs added. No game physics, renderer, UI, assets
  or production/preview deployed files changed.
- `npm test` and `npm run test:browser` required before signoff.
- The original game's preferred long-term development track is Unity; this
  bounded legacy test protects today's playable handling until migration.
