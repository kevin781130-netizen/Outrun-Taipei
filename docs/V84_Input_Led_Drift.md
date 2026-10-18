# V84 — Input-led drift trajectory; 3% smaller player model

## Reference investigation

Reviewed primary sources on 2026-10-18:

- Jake Gordon, JavaScript Racer, [curves/update explanation](https://jakesgordon.com/writing/javascript-racer-v2-curves/): road-relative player lateral motion and curve/speed-driven outward push are separate. Curve values are explicitly arbitrary gameplay units. This segmented-road model is closer to this game's coordinate system than a direct port of a full tire simulator.
- VDrift, [cartirebase.h](https://github.com/VDrift/vdrift/blob/master/src/physics/cartirebase.h), blob `8d8f13837e5b9f166505417cdae30337412e8933`: tire slip angle is derived from longitudinal/lateral velocity. [cartire1.cpp](https://github.com/VDrift/vdrift/blob/master/src/physics/cartire1.cpp), blob `52d4dce2d3c7c0bec9b4879e52f71ce805038ecb`, computes lateral force using slip/load/friction. A car's rendered body yaw is not itself an extra input command.
- pmndrs/racing-game, [Vehicle.tsx](https://github.com/pmndrs/racing-game/blob/main/src/models/vehicle/Vehicle.tsx), blob `9a75eb5b3f634005912a0ed1c7cc87b26eb9ced4`: steering and engine/brake commands go to a raycast vehicle; camera and chassis visual lean are handled separately.

The implementation below is an independent, simplified arcade control law. It
is not a VDrift tire simulation, and no reference engine/source was transplanted.
Parameters are calibrated in this game's normalized road units, not borrowed
between incompatible physics engines.

## Finding and correction

V82 reduced the sum of inward body/travel-yaw, steering and corner-bite terms, but
left the coupling intact. A yawed car continued to generate inward target motion
with neutral steering. Recovery bypassed the attenuation and restored the larger
yaw force. Both behaviors can pull the car toward the apex after the driver has
already released or reversed input.

V84 uses an explicit, bounded road-relative command throughout drift/recovery:

- Same-direction command authority eases from 0.26 at low speed to 0.20 at
  270 km/h, multiplied by steering input. At 180 km/h it is 0.22.
- Entry ramps from 65% to 100% over 0.28 s using smoothstep.
- Neutral input produces zero turn command, while existing curve outward push
  and lateral velocity integration remain active. Existing momentum is not reset.
- Opposing input retains the old full direct-steering authority. Body yaw no
  longer adds another inward term, so countersteering does not fight that term.
- Recovery uses the same bounded input-led target. V68/V69 damping remains active;
  its target changes intentionally, rather than returning to amplified yaw force.
- Grip driving uses the existing equations. Chassis yaw/slip targets and V81's
  correct visible nose/wheel direction remain intact. No lane-center target exists.

Competitive records move to rules 84.0. Old entries remain under their old keys.
Historical namespace assertions and the audited motion fingerprint are updated.
The historical regression asserting that tighter bends *automatically* create
more inward drift is replaced with a bounded-displacement check for both bends.

The full-3D player scale and its supplemental road shadow shrink uniformly by
3% relative to V83. Camera, traffic model sizes and collision dimensions are not
changed. This is the small visual size adjustment requested by the player.

## Evidence

`tests/v84-input-led-drift.cjs` supersedes the V82 gain-only test. It compares
against the frozen, original V82/V83 motion function in
`tests/fixtures/v82-motion.cjs`, injected only into the test VM. No legacy mode is
exposed in the game. It covers 18 speed/curve/steering configurations and their
left mirrors, actual update-driven drift entry, neutral/countersteer/recovery,
initial outward momentum, yaw-independent trajectory and a two-second corner.

At 180 km/h, curve 1.2, full turn input for 0.8 s, inward X displacement changes
from 0.394277 (V82/V83) to 0.130721 (V84): **66.85% less**. These are normalized
road coordinates, not meters or a universal guarantee across all bends. Over
that comparison window, all 18 cases retain yaw, slip, speed, drift phase and
nitro frame for frame. Grip direct-step state is identical to the old motion.

Same V84 input at 30/60/120 Hz over 0.8 s gives X
0.133536/0.130721/0.129207. At 60 Hz, two seconds of the reference turn gives
X 0.370373. The first step preserves an existing outward velocity rather than
snapping it inward. Opposite turns remain symmetric. Real Three.js world-space
checks verify all three scale axes and the road shadow are precisely 97% of V83.

Full npm test covers existing recovery, scoring, recorder, replay, geometry and
rendering-structure checks. Cloud Chromium cannot create a WebGL context, so
GPU appearance/FPS and final driving feel still need player validation.
