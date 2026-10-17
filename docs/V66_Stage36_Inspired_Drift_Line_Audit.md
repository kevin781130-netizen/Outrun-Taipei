# V66 — Controlled Drift Line / OutRunners Source-inspired audit

## Scope and evidence honesty

The player referenced an earlier uploaded artifact
`OutRunners_Stage36_Real_MAME_Write_Tap_Validation_Toolkit(4)/(5).zip`.
This artifact **was not available to open during V66 development**: the active
session mounts and accessible library searches did not locate a copy.

From previous documented review of that package, the defensible
transferable idea is the **input snapshot + key press/release event queue +
replay validation** approach. There is **no confirmed real MAME running
trace** that validates the original OutRunners steering, cornering, drift,
lateral motion or collision formulas. No Stage36 physical coefficients have
been copied, inferred or attributed to original arcade code.

Additional public context: actual OutRunners hardware/platform emulation in
MAME is in `src/mame/sega/segas32.cpp` for Sega System 32, not the Sega
OutRun `segaorun.cpp` driver; emulator input mappings are not the commercial
game's proprietary movement equation. See
https://github.com/mamedev/mame/blob/master/src/mame/sega/segas32.cpp
for the device-level source only.

## Root cause observed in Outrun-Taipei V65 source

1. `v51DriftVisualYaw()` added *physical chassis yaw* to additional signed
   slip exaggeration (visual yaw approximately `1.18*yaw + .72*slip`).
   This can over-rotate the vehicle relative to its actual path.
2. `v51DriftVisualPose()` independently shifted the **entire rendered car**
   outward based on the exaggerated yaw (including its shadow). This visual
   displacement was not based on the physical lane coordinate `playerX`.
3. `stepArcadeMotion()` did have driver-controlled drift turning through
   `yawTurn` and `steer*baseAuthority`, but the bend-following leverage
   could feel weak relative to road motion at tight corners.

## V66 changes: small, measurable, reversible

- Visual yaw uses `1.04*driftAngle + .34*signedSlip`, capped at **46 degrees**
  (respecting the existing shallow-curve cap). This retains outward rear
  swing but avoids visually counting sideways slip twice.
- Visual whole-chassis horizontal offset reduced to **28%** of former
  presentation; independent shadow swing to **35%**. Physics coordinate
  `playerX` and projection camera conventions remain untouched.
- Adds `v66DriftLineBite()` to `stepArcadeMotion()`, with maximum **.18**
  extra lateral turn authority at full turn input / full curvature. It
  activates **only** during drifting, with sufficient road grip, and when
  the user actively steers toward the direction of the curve.
- No inward attraction on neutral input, opposite-direction countersteer,
  road grip below .8, low curvature or ordinary grip steering. Overspeed
  outward push and high-speed speed scrub rules are unmodified; drifting
  still demands route choice and correct entry speed.
- No change to the drift-entry boost, nitro duration / charging formula,
  stage drift continuity, traffic collision boxes or route assets.
- New **competition rules version 58.0**, isolating old handling & score
  records from the physics-tuned run. Existing best records remain stored
  independently.
- These values are **original design tuning parameters**, not proven ROM
  constants; they require live human feel acceptance.

## Historical code fingerprint ledger

`tests/v56-drift-replay.cjs` retains its untouched drift-state fingerprint
`51090577`, and updates *only the explicitly modified sections*:

| Fragment | V65 fingerprint | V66 fingerprint |
|---|---|---|
| stepBrakeDrift body | `51090577` | `51090577` |
| stepArcadeMotion body | `511b772f` | `f32d34ee` |
| DRIFT51 → V52_CORNER (incl. visual) | `106f1ac2` | `4d7079af` |

`tests/v66-controlled-drift-line.cjs` samples deterministic input frames
at **60 Hz** across both turning directions, the Shift drift entry,
countersteer and release states, and checks left/right symmetry, zero
automatic inward pull and visual safety. The old V56 replay tests still run.

## Rollback & release acceptance

**Approved V60** must stay pinned:
- `Outrun-Taipei/checkpoint/v60-user-approved-20261017` at
  `7dd64411e08143c355218dd57b5b01bf8b32db8a`.
- `GAME-TEST-LAB/checkpoint/outrun-v60-user-approved-20261017` at
  `95dc64fb73e74efd55c66d1d1b880f1c53609591`.

V61–V65 preview paths, stable public main and previous scoring continue
untouched. Deploy V66 only to a new isolated path. Source/Chromium tests
are **not proof of actual GPU visuals**: test driving on right/left bends,
shallow/tight bends, road edge, countersteer, route changes and mobile
controls before promoting. Prefer Unity Primary for future major physics
architecture.
