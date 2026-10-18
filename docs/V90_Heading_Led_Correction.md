# V90 — Slightly stronger drift correction, guided by the nose

V89 retains V88 physics. V90 keeps the same body yaw/slip, entry, transfer,
recovery, road and camera settings, but makes a held active-drift correction
slightly stronger and lets an aligned nose contribute a small amount.

The command starts with the greater of:
- 1.04 times the existing V88 same-direction command; or
- 1.06 times the matched normal direct steering authority, with the existing
  input shaping and drift entry ramp.

The normal reference is `.238 * v51SteeringProfile(speed, false).authority`.
It is the direct steering channel, not the total normal-driving trajectory:
normal driving also has heading, curve-entry bite and front-grip terms. This
calibration does not promise a larger total turning radius change for every
speed, bend, brake input or transient state.

An aligned nose multiplies that requested command by at most another 1.06.
The contribution grows with yaw up to 45 degrees and with raw steering intent
from 0.10 to 0.50. Raw intent is passed directly from update() to motion so
release disables the nose aid immediately, while the established steering
smoothing and inertia still unwind normally. The aid is zero with no command,
a mismatched nose, countersteering or recovery. It never adds an autonomous
inward force. A stale old-side yaw during a drift transfer cannot steer against
the new direction. There is no new persistent state or new angle target.

Reference update replay (180 km/h, curve 1.2, 0.8 input, 60 Hz, 300 ms):
- inward lateral speed: V89 0.173879 -> V90 0.191367 road units/s (+10.06%);
- position: 0.043135 -> 0.047337 road units;
- body yaw: unchanged at 37.376553 degrees; slip and speed also unchanged.

Rules/record namespace is 90.0. Rendering assets are unchanged from V89.

Validation: 18 old/new real-update pulse/release/opposite-input pairs cover
110/180/240 km/h, both sides and 30/60/120 Hz. Tests require a genuine inward
speed increase, under 0.009 extra road units at 300 ms, bounded reference road
positions, identical body yaw/slip/speed/state and unchanged normal driving.
Raw-intent capture proves actual update() forwards zero on release. Command
probes cover 110–270 km/h, multiple input strengths, both directions, shallow
and large nose angles, the 6% cap, wrong-side yaw, neutral, counter and recovery.
The existing linked-transfer, exit and stage-continuity suites remain active.

Historical V88 gain-isolation tests explicitly bypass the V90 wrapper; their
old behavior remains covered alongside V90's own old/new replay. V84's old
absolute heading-independence check now enforces exact independence in recovery
and a small bounded heading difference in active drift. Source audit hashes and
record expectations are updated for this intentional physics change. Tests are
simulation checks; subjective dodge feel and WebGL rendering need player review.
