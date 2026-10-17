# V68 — Progressive Drift Regrip (driver-target continuity)

## Why
The V67 experiment added physical countersteer dampening while the car is in
`drift` state. Once the steering hold initiates `recover`, the
V67 catch intentionally disengages; the outgoing drift still uses a slower
lateral rate (14.2/s) even as its art yaw and slip converge to straight.
This can make the car appear upright while its lane displacement lags.

## V68 intervention
The on-road **recovery** state alone receives an additional
exponential lateral convergence to the same `desiredLateral=turn-outward`
used in regular steering. It is not a special magnet to road centre, does not
edit `playerX`, cannot add yaw, and cannot override the driver's actual
lateral command.

- `v68RecoveryRegrip(dt,desired,grip)` validates positive finite dt,
  finite command, `isDrifting`, `driftState==='recover'`,
  forward motion, and `roadGrip>=0.8`.
- Additional convergence rate varies smoothly from 2/s (slip ≥14°) to
  9/s (slip 0°): small authority while sliding hard, stronger as a slide
  finishes. Uses `1-exp(-dt*rate)` for frame-step invariance.
- Off-road slides, active drifting, reverse gear, normal grip turns and pause
  do **not** activate it. V67 countersteer catch remains independent.
- Preserves actual road widths, body visual yaw, traffic collision, speed
  scrub, boost/NITRO, existing Apex/Flow/Switchback/Coach/Drill scoring.
- Changes the physical lane trajectory; competitive namespace
  `COMPETITION.version` **59.0 → 60.0**.

## 60Hz tests
`tests/v68-progressive-regrip.cjs` asserts two-direction mirror recovery,
greater convergence as slip settles, no single-step velocity teleport, no
interference with neutral/normal drifting/low grip/reverse/paused state, and
the **actual `stepArcadeMotion`** vs a precisely disabled V68 A/B control.
It additionally checks unchanged speed/NITRO and distinct leaderboard key.
All previous replay and browser smoke cases remain CI gates.

The exact motion fingerprint changes from `39618802` to `a6f0b140`.
Existing brake/drift finite state fingerprint `566e6b2c` and
visual/rules fingerprint `4d7079af` are unchanged. No third-party code
or reverse-engineered arcade physics coefficient was copied.

## Safety and release protocol
- Player-approved V60 source checkpoint:
  `checkpoint/v60-user-approved-20261017`,
  `7dd64411e08143c355218dd57b5b01bf8b32db8a`.
- Player-approved V60 Pages checkpoint:
  `checkpoint/outrun-v60-user-approved-20261017`,
  `95dc64fb73e74efd55c66d1d1b880f1c53609591`.
- Main legacy browser production and isolated V60–V67 previews remain
  untouched. V68 is a draft PR stacked on V67, and will publish to
  `outrun-taipei-v68-regrip-preview/` only if CI quality gates pass.
- Actual deployed GPU view and subjective handling acceptance must be
  confirmed separately; tests alone do not certify that the drive feels
  natural. Major new systems should continue toward Unity Primary.
