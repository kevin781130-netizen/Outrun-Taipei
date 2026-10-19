# V93 — Whole-motion drift correction and longer, faster-flowing routes

The previous V92 command exceeded only the direct steering channel. In a matched
180 km/h, 0.8 steering, 1.2 curve, half-second update replay, actual drift lateral
displacement was 0.09208 versus grip 0.23872 (39%). V93 references the complete
normal-turn demand: steering-derived grip yaw, steering authority, corner bite
and speed-dependent front grip. It does not use the sideways drift yaw as an
additive lateral force. The existing entry ramp and at-most-6% requested heading
contribution remain; neutral, opposing steering and recovery use the existing law.

In the same 60 Hz replay V93 displacement is 0.26491 versus normal 0.23872 (+11%).
This is a calibrated half-second correction example, not a universal 10% multiplier
for every speed, road, transient or input. Body yaw, slip, speed, linked transfers
and normal driving retain their laws. Fifty-four matched update comparisons cover
110/180/240 km/h, both sides, 30/60/120 Hz and 0.3/0.8/1 steering. Six old/new release
and countersteer pulses also compare pose, speed and state exactly.

Route marker positions are rounded to 115% and transition length is 184 segments
instead of 160. WORLD_SPEED becomes 20.7 instead of 18 for player and traffic.
Render buffers are unchanged. The longer geometry and faster forward flow retain
constant-speed stage budgets within one second on all 15 route nodes. Distance
labels use the existing WORLD_SPEED conversion, so this is 15% more road geometry,
not a claim of 15% more displayed kilometers. Nitro acceleration, 270/300 speed
caps, crash rebuild and seven-second 200→300 ramp remain unchanged.

Scenery spacing, building footprints, camera position/FOV/damping and lighting
are retained. Shells, windows, roof details and signs share a smooth per-instance
fade near the existing stream boundaries. The fade uses fractional segment
progress and absolute seeded buildings, avoiding a stepped reset each segment,
and works on curved roads independently of camera depth. Existing instance
batches and materials are reused. Transparent blending retains depth writes for
occlusion; GPU compositing and comfort still require a real playtest.

Validation: npm test passed all regression and V55–V93 suites. After the final
per-instance fade refinement, full-3D geometry, facade/shader/segment-continuity,
new handling pulses and bundle consistency were rerun. The existing facade source
SHA audit and motion fingerprint were deliberately updated. Historical V84/V86/
V90/V92 tuning assertions explicitly use a frozen V92 command; the new V93 suite
checks the live stronger handling. No historical bounds were silently widened in
those isolation suites. The main regression's old 0.20 one-second displacement
bound is replaced by a 0.70 bound for the requested stronger correction.

Three.js geometry and shader hooks were tested with a mocked renderer. No GPU
frame-rate, actual rendered comfort or human handling assessment is claimed.
