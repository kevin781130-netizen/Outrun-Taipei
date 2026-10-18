# V87 — Continuous drift transfers and slightly stronger fine corrections

## Player behavior

- Keep throttle applied and steer into the next, oppositely curved bend to link
  drifts. Steering must deliberately oppose the old drift for at least 0.10 s.
- Hold Shift (or the held drift control on touch/gamepad) plus throttle for a
  deliberate left/right transfer independent of road curvature.
- Without a held drift control or a new-bend/lift-reapply intent, holding
  countersteer on the same bend still performs the existing recovery/exit.
- Releasing direction or throttle still permits normal recovery. No steering
  command means no transfer; the road does not choose a lane or drive the car.

The controls text now advertises holding Shift for linked drift.

## Root cause

The old state machine entered `recover` after 0.16 s of countersteering, set yaw
and slip targets to zero, then required re-entry for the next drift. The existing
lift/reapply transfer also retained a stale `counter` flag after changing drift
side, trimming the new drift target on its first frame. Visual yaw derived slip
sign from body yaw, which could discontinuously flip the slip contribution while
crossing center.

## Correction

For a deliberate transfer (throttle, forward gear/motion, speed >=100, grip >0.8,
no brake, suitable curve/held drift/lift-reapply intent): retain `isDrifting`, yaw,
yaw rate, slip and lateral velocity. Hold current angle/slip targets during the
short intent window, then blend toward the new side over 0.32 s with smoothstep.
There is no forced grip/zero-target phase. Recompute counter status after changing
side. Existing lateral command integration still follows the driver and road.

While the transfer settles, the actual yaw-position increment is bounded by the
existing 190 deg/s rate cap, keeping position consistent with that cap. Use actual
signed slip for visual yaw until the transfer settles, avoiding a sign flip at
center. The transfer remains active through its settling tail. Race reset clears
all new state; automatic stage handoff preserves it. Recovery still cancels it.

Fine correction during a live drift maps normalized input s to
`s * (1 + 0.08 * (1 - abs(s)))`. The maximum addition is 0.02 full-scale input:
0.50 becomes 0.52; zero and full steering remain zero and full. Grip and recovery
bypass this shaping. V84 sustained full-lock authority, road geometry and camera
settings are unchanged. V86 drift response rates remain in use.

A transfer resets its clean-drift interval and catch latch, does not enter grip,
and does not arm an exit boost merely for switching sides. Competitive records
use 87.0; old records remain under their old keys.

## Validation

Full npm test passes, including the existing drift exit/recovery, recording,
paired replay, geometry and UI checks. Audited drift/visual fingerprints and
namespace expectations are updated for these intentional changes. The V86 target
assertion now accounts for the explicitly added fine-input shaping.

New actual-update replays verify automatic chicane and manual-held transfers,
no grip/recover plateau in the link, no exit-boost award, mirror symmetry, bounded
positions, low-speed/no-throttle exclusions, explicit intent gates, zero-dt safety,
reset and 30/60/120 Hz operation. The stage continuity test includes all four new
transfer fields. Fine-input checks enforce the 0.02 maximum addition and unchanged
zero/full inputs, grip and recovery shaping.

Reference 180 km/h chicane at 60 Hz: opposite input begins at t=0.20 s; drift-side
transfer begins at t=0.30 s. Body yaw spends 0.0333 s within ±3 degrees while crossing
center (not parked upright). Maximum visual yaw change is 4.1275 degrees per frame;
final road-relative X at 1.2 s is -0.107275. These are scripted reference measurements,
not a guarantee for every bend or a substitute for player feel testing.

Cloud Chromium cannot create a WebGL context. Actual driving feel, traffic-dodge
success, GPU appearance and FPS require player validation of the V87 preview.
