# V67 — Countersteer Grip Catch / open racing design review

## Reference audit (October 2026)

The user supplied [bobeff/open-source-games](https://github.com/bobeff/open-source-games), a curated **directory**, not an engine. Examined the actual repositories:

- [SuperTuxKart skidding](https://github.com/supertuxkart/stk-code/blob/master/src/karts/skidding.hpp): explicitly separates visual skid rotation from actual physics steering, and models left/right skidding states. **Idea used:** separate aesthetic chassis angle and input-driven recoverability.
- [VDrift tire physics](https://github.com/VDrift/vdrift/blob/master/src/physics/cartire2.cpp): computes tire slip angle and lateral forces under friction constraints. **Idea used:** lateral motion should depend on real road grip and player correction, not art rotation.
- [Dust Racing 2D tire](https://github.com/juzzlin/DustRacing2D/blob/master/src/game/tire.cpp): differentiates on-track from off-track tire friction. **Idea used:** countersteer recovery requires adequate road grip.

All three source files carry GPL-3-or-later terms. **No source, models, assets, or algorithms were copied.** Our original bounded arcade-rate multiplier does not implement their tire equations.

## User-provided archive inspected
Actual file `OutRunners_Stage36_Real_MAME_Write_Tap_Validation_Toolkit(6).zip` contains **408 files** including `mame/OutRunners_Trace_Live_Writes.lua`, `mame/Run_Auto_Physics_Capture_Windows.ps1`, `scripts/analyze_mame_live_writes.py`, static V70 writer candidate maps, and input/event test harness.

Authoritative archive status `analysis/physics_verification/STATUS_zh-TW.md` states **G0 PASS only**, G1 (actual MAME execution), G2-G6 (true writes, A/B inputs, drift and collision causal physics, original model) **unverified**. No live `outrunners_live_writes.csv` or `actual_capture/` folder was in the archive. This is not a measured ROM tire coefficient set. The independent V67 behavior below must **not** be attributed to the original arcade's numerical formulas.

## V67 arcade behavior
V66 improved player-controlled inward path and reduced visual outward body swing. V67 adds a **true, bounded physical lateral-velocity catch** when the player deliberately countersteers.

- Active only if drifting, not in recovery mode, forward moving, speed >=70 KM/H, road grip >=.8, slip angle >=5 degrees, steer magnitude >.22 **against the slip**, and existing lateral velocity still travels **with** the slip.
- Damps **only** the already existing signed lateral velocity by `exp(-dt * rate)` where `rate = 1.5 + 2.7*steering_factor*slip_factor` (bounded 1.5–4.2 s⁻¹). Each 60 Hz tick is continuous, no velocity reversal / teleport.
- Holding a valid catch for .15 gameplay seconds triggers **one** `SLIDE CAUGHT!` feedback popup per drift. No new bonus points, boosts or item inventory.
- Counter input that does not oppose actual slide, neutral input, off-road, low-speed, reversing, normal grip driving, and failed/ended drift **never** receive the benefit.
- Stage changes and restarting clear hold state. Restart also resets the non-scoring catch count.
- No changes to race track geometry, road collision, traffic, camera, existing nitro charging, APEX/Flow/Switchback rules, or Stage36 ROM files.

**Rules version 59.0** isolates competitive records from V66 (58.0), because real lateral vehicle physics changed. Earlier versions retain their saved data.

## QA and rollback
`tests/v67-countersteer-grip-catch.cjs` tests mirrored left/right catches, absent auto-rail, pause, one-shot feedback, stage/race reset, real `stepArcadeMotion()` effect against A/B disabled catch, untouched acceleration / nitro. Existing seven 60Hz replay scenarios and V60–V66 regression must also pass. Source fingerprints updated deliberately for the changed `stepBrakeDrift` fragment (new helper insertion) and lateral-motion fragment.

Player-approved immutable-intent recovery branches:
- Outrun-Taipei `checkpoint/v60-user-approved-20261017` at `7dd64411e08143c355218dd57b5b01bf8b32db8a`.
- GAME-TEST-LAB `checkpoint/outrun-v60-user-approved-20261017` at `95dc64fb73e74efd55c66d1d1b880f1c53609591`.

This is a new **Legacy-Web standalone test** on top of V66, not a migration or replacement for Unity Primary. Publish to an isolated `outrun-taipei-v67-grip-catch-preview/` directory only, maintain all V60–V66 previews and official main. Separate live visual QA is required; CI alone does not verify on-screen drift behavior.
