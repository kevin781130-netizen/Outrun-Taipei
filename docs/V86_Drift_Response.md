# V86 — Slightly faster drift corrections without a larger turn target

Player feedback: V84/V85 cornering magnitude and road presentation feel right,
but short drift corrections for dodging traffic feel weak. Increase responsiveness
slightly without restoring the earlier apex pull or increasing sustained authority.

## Change

A shared `v86DriftResponseRate()` wrapper multiplies only drifting response rates
by **1.12**:

- steering input smoothing, including opposite-direction input;
- steering release smoothing, so a short correction does not linger;
- lateral-velocity interpolation toward the existing V84 driver/road target.

The exponential form is retained. A 12% larger rate shortens its time constant
by about 10.7%; it is not a universal 12% reduction in measured driver latency.
No instantaneous velocity reset, extra lateral impulse or extra turn authority is
introduced. Initial outward momentum still decays through integration.

`V84_DRIFT_LINE` authority, entry envelope, neutral-zero-turn behavior, outward
curve push and countersteering target are unchanged. The grip branch returns the
original rate exactly. Existing yaw/slip target equations are unchanged, though
they can follow the faster smoothed input sooner. Recovery still uses V68/V69.
V85 lighting, V84's 3% model scale, camera and road geometry are preserved.

Physics response changed: competitive records use **86.0**; older entries stay
under their previous keys. Namespace assertions and the audited motion fingerprint
are updated, with no removal of gameplay checks.

## Evidence

`tests/v86-drift-response.cjs` exercises real `update()` input for 18 combinations
of 110/180/240 km/h, left/right turns and curves 0.35/1.2/2.4. Each has a sustained
0.8 steering command and a 100 ms correction, release and short opposite correction.
The comparison bypasses only the new rate wrapper in the test VM, retaining the
V85 response equations. No comparison mode is exposed to players.

At 180 km/h, curve 1.2:

| Measurement | V85 rate reference | V86 |
|---|---:|---:|
| Smoothed steering after 100 ms | 0.650366 | 0.677633 |
| Lateral velocity after 100 ms | 0.073966 | 0.083884 |
| X after 1 s sustained input | 0.138741 | 0.141035 |
| Lateral velocity after 1 s | 0.156526 | 0.156509 |
| Steering at t=300 ms (pulse t=0–100 ms) | 0.017770 | 0.012020 |
| Lateral velocity at that release sample | 0.002249 | -0.001980 |

Positions/velocities use normalized road coordinates, not meters. At the 100 ms
sample, lateral response is about 13.4% greater. The one-second X difference is
0.002294 road units; sustained lateral velocity has converged almost exactly.
The tiny negative release velocity reflects existing curve outward push once the
inward command has decayed, not an added opposite impulse.

All cases require earlier initial/opposite corrections, less input and inward carry
after release, unchanged profile authority/lift/brake values and unchanged V84
steady targets. They bound the one-second X difference below 0.015 road units,
transient yaw difference below 2 degrees, and reference X within ±0.5. Grip rows
are identical to the rate-reference replay. Existing V84 tests also exercise
30/60/120 Hz and neutral/counter/recovery, alongside the full npm test suite.

Automated input replays do not prove real traffic collision avoidance or preferred
feel. Cloud Chromium cannot create a WebGL context; actual driving feel, PBR and
FPS need player review of the public V86 build.
