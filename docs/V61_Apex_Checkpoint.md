# V61 — APEX CHALLENGE (on the approved V60 Checkpoint)

## Checkpoint / guaranteed rollback
The V60 handling and preview were explicitly approved by the player.

- **Game source exact commit:** `7dd64411e08143c355218dd57b5b01bf8b32db8a`.
- **Preserved source branch:** `checkpoint/v60-user-approved-20261017` in `Outrun-Taipei`.
- **Public preview publication commit:** `95dc64fb73e74efd55c66d1d1b880f1c53609591`.
- **Preserved preview branch:** `checkpoint/outrun-v60-user-approved-20261017` in `GAME-TEST-LAB`.
- **Frozen user-approved preview:** `GAME-TEST-LAB/outrun-taipei-v60-corner-preview/`.
- This V61 implementation changes neither the V60 source branch nor the existing V60 preview path.
- The checkpoint is backed by Git branches, not immutable annotated Git tags; avoid force-pushing or deleting these refs.

## V61 gameplay evolution
Introduces a lightweight APEX CHALLENGE reward when players exit a sufficiently
long, curved section without going off the road or crashing. Two grades:

| Grade | Requirement | Reward |
| --- | --- | --- |
| CLEAN CORNER | Meaningful bend, adequate speed, maintained grip, exits clean | +240 score |
| PERFECT APEX | Clean bend plus at least .38 s of controlled drifting | +650 score |

- The mechanism tracks real stage curvature and a minimum 30-segment travel distance.
- It cannot farm a short curvature spike, award the same corner twice, pay out
  mid-corner, or carry a pending run through a stage transition.
- An off-road episode cancels the run. A crash or reverse gear clears it.
- On valid completion, the existing STYLE popup shows the rating. No new DOM
  dependencies, libraries, audio, or persistent telemetry.
- Only score changes. `speed`, `steer`, drift dynamics, nitro charge, boost,
  lateral velocity, route selection and camera are unchanged.
- Scoring rule revision is `COMPETITION.version='55.0'` to isolate older local
  leaderboard records from new award totals.

## Verification
`node tests/v61-apex-challenge.cjs` checks clean and drift-award cases,
no duplicate, no short bend farming, no off-road award, route reset and
new-race reset, score isolation and physics invariants.
The existing deterministic/renderer/browser suites still run via `npm test`
and `npm run test:browser`, with expected rules namespace updated.

Visual inspection of a matching deployed V61 preview remains necessary.
Official `main` and V60 checkpoint must not be changed automatically.

## Future
Prefer Unity Primary for major new gameplay architecture. The isolated V61
browser change only extends existing legacy HUD scoring and preserves the
approved browser game.
