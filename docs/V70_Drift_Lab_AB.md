# V70 — DRIFT LAB (comparative steering observability)

## Why this iteration
V66–V69 iteratively tuned physical corner control, countersteer catch,
recovering lateral tire grip and residual drift-exit sway. Actual player
feel and public GPU visual sign-off is still missing. Blindly adding another
inward assist is not evidence-based. V70 adds an **optional empirical A/B
comparison** without changing the game's V69 default car mechanics.

## User instructions
1. Select **自由巡航 / cruise** on the start menu.
2. Start driving. Click **🔬 DRIFT LAB K** or hit **K** to open/close.
3. Read live body YAW (degrees), tire SLIP (degrees), signed lateral
   velocity (internal road-relative units per second), road grip and FSM
   state at the game's own ~20 Hz HUD refresh cadence.
4. Click **切換 V68 / V69** or hit **B** while DRIFT LAB is open.
   - **V68 SETTLE OFF** bypasses only the V69 post-recovery stabilizer.
   - **V69 SETTLE ON** preserves the existing default V69 behavior.
   V66 inward drift bite, V67 countersteer and V68 active recovery regrip
   remain identical in both comparisons.
5. Repeat the same lane, turn, speed and control sequence for each mode;
   read sample count, mean absolute lateral velocity and peak lateral
   velocity. They are **descriptive aggregates**, not paired causal metrics
   or scientific proof, because real driving inputs may differ.
6. **清除記錄** resets the two in-memory aggregates only.
   Closing the panel **restores V69**. Nothing saved or transmitted.

## Integrity and safety
- **No change to V60–V69 default V69 physics.** In arcade and sprint,
  `v70UseV69()` always returns true, and the experiment switch is denied.
  `COMPETITION.version='61.0'` stays unchanged.
- The A/B alternate is allowed **only** in cruise when the DRIFT LAB has
  been deliberately enabled. A hidden panel does not leave experimental
  physics active. Mode switching resets pending V69 settle time so one
  mode cannot inherit an interrupted settle window from the other.
- No new score, nitro, tire, traffic, collision or stage changes.
- Frame sampling only via the actual 0.05-second HUD update, when the game
  is actively racing, not paused and not in a crash state.
  Repainting after a button click, showing the panel, or pressing clear
  **does not manufacture samples**.
- Stats are two bounded running aggregations (constant memory); they
  contain no identifiers, are never persisted, uploaded, tracked or
  exposed to network APIs. Route-specific comparisons are recommended;
  telemetry alone does not prove a model is better.
- Accessibility: real in-page buttons for the open/close, toggle and clear
  actions, keyboard shortcuts K/B, focus-visible styles, no per-frame
  live announcement.
- Panel is initially hidden, positioned at a corner away from the centre
  road, compacted for mobile. **Deployed visual inspection remains required.**

## QA
`tests/v70-drift-lab-ab.cjs` runs V68 vs V69 live `stepArcadeMotion`
and compares physical lane displacement; asserts the unchanged competitive
record namespace, arcade/sprint forcing V69, correct pause/clear and
sampling cadence, panel closed restoration, and no added score/nitro.
`npm test` and Chromium `npm run test:browser` must both pass.

## Governance
- Dedicated branch `feat/v70-drift-lab-ab`, stacked on V69 PR #45.
- Source V60 user-approved checkpoint remains
  `checkpoint/v60-user-approved-20261017` at
  `7dd64411e08143c355218dd57b5b01bf8b32db8a`.
- GAME-TEST-LAB approved checkpoint
  `checkpoint/outrun-v60-user-approved-20261017` at
  `95dc64fb73e74efd55c66d1d1b880f1c53609591`.
- No main source merge. Preserve official production and V60–V69
  preview trees. Deploy only a new
  `outrun-taipei-v70-drift-lab-preview/` path.
- Major future racing systems target Unity Primary; this is a contained
  legacy-browser diagnostic feature.
