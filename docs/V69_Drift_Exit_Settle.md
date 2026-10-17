# V69 — Drift Exit Settle / post-recovery stabilisation

## User problem
V66–V68 progressively improved the visual drift, real countersteer and
regrip while the car remains in `recover` state. A fast exit can still
leave residual lateral momentum and small yaw-rate after the existing
drift FSM finishes, causing a short unwanted tail wag even after the driver
releases steering.

## Guardrails
V69 adds only a short **0.42 gameplay-second transition window**, armed
**when `stepBrakeDrift` genuinely finishes recovering and switches from
`recover` to `grip`**. Other cases may not arm it.

`v69ExitSettle(dt,desired,steer,grip)` is active only when:
- the window is nonempty and finite positive simulation `dt` advances;
- driving **forward**, **on road (grip ≥0.8)**, at least **70 km/h**;
- drift FSM is `grip`, with `isDrifting=false`;
- driver has **near-neutral actual smoothed steering** (absolute ≤0.12).
- computed desired turn and steering are finite.

If steering is actively re-engaged, the window continues to decay but does
**not intervene**. Thus left/right S-bends, immediate re-entries and
countersteer retain direct driver authority.

On each valid tick it applies extra **2.4–8.0/s exponential convergence**
to the **already-computed, driver/road-specified** lateral target, and
damps residual yaw-rate at ≤3.0/s. It does **not** set `playerX`,
snap to a centre lane, add steering/score, or interfere with Nitro / drift
charging. The effect automatically fades away after 0.42s.

Scene/stage transitions, `resetDrivingState`, a crash, and new races
clear the window. Pause freezes the simulation window. Rules version
**61.0** separates handling times/scores from V68 `60.0`; older records
remain unchanged.

## Regression and source provenance
- New `tests/v69-drift-exit-settle.cjs`: actual 60Hz lateral integration
  A/B, mirrored left/right, neutral vs active steering including next S
  bend, low grip/reverse/paused inputs, safe expiration, no snap, genuine
  state transition, unchanged acceleration/Nitro/score, stage/race reset.
- `npm test` and Chromium `npm run test:browser` remain required.
- Motion-body audited fingerprint V68 `a6f0b140` → V69
  `1a667ef4`; drift state-body V68 `566e6b2c` → V69
  `d8a66b4a`; visual and reference guard fragment remains
  `4d7079af`.
- No GPL, original-game ROM material, external assets, proprietary code or
  unverified physical coefficients imported.

## Shipping and rollback
- Source draft branch `fix/v69-drift-exit-settle`, stacked on V68.
- Approved checkpoint source:
  `checkpoint/v60-user-approved-20261017` at
  `7dd64411e08143c355218dd57b5b01bf8b32db8a`.
- Approved checkpoint Pages:
  `checkpoint/outrun-v60-user-approved-20261017` at
  `95dc64fb73e74efd55c66d1d1b880f1c53609591`.
- Never overwrite production or V60–V68 previews. V69 uses
  `outrun-taipei-v69-exit-settle-preview/` only.
- Browser test success is **not** visual sign-off of rendered public Pages.
  Live 3D screenshots/driver playtesting remain mandatory prior to
  promoting. Future major game systems prefer Unity Primary.
