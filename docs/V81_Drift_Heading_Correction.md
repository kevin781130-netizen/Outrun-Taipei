# V81 — correct the rendered drift heading

The reported symptom was a car that appeared to push bodily toward the outside
instead of pointing its nose into the turn while retaining lateral momentum.

## Reproduced fault

Gameplay defines positive steering/yaw as right. The vehicle mesh faces -Z;
Three.js positive Y rotation turns that nose toward -X (left). Full3DScene passed
game angles directly into that mesh's local rotation. Right-turn drift therefore
displayed an outward-facing nose. Front-wheel steering had the same sign error.

The new regression failed on V80 by comparing the actual transformed nose-to-tail
axis against the road's right normal. Earlier angle-magnitude and mirror-symmetry
checks did not catch it: both mirrored directions can be consistently reversed.

## Correction

Convert yaw and wheel-steer signs exactly once at the Full3DScene presentation
boundary. Preserve the road tangent, physical slip/yaw, lateral momentum, inputs,
camera, collision and scoring. Countersteering rotates the front wheels without
instantly reversing the chassis. This does not implement a new tire model or
claim the existing inertia parameters are now fully calibrated.

## Open-source investigation

- pmndrs/racing-game, `src/models/vehicle/Vehicle.tsx`:
  https://github.com/pmndrs/racing-game/blob/main/src/models/vehicle/Vehicle.tsx
  Blob reviewed: `9a75eb5b3f634005912a0ed1c7cc87b26eb9ced4`.
  Uses raycast vehicle physics with explicit left/right steering signs; steering,
  body motion and camera sway are separate concerns. It is useful reference for
  the coordinate boundary, not a drift formula to transplant.
- VDrift, `src/physics/cartire1.cpp` and `src/physics/cardynamics.cpp`:
  https://github.com/VDrift/vdrift/blob/master/src/physics/cartire1.cpp
  https://github.com/VDrift/vdrift/blob/master/src/physics/cardynamics.cpp
  Blobs reviewed: `52d4dce2d3c7c0bec9b4879e52f71ce805038ecb`,
  `ef86ef743d636faecc989b745106f7aae597fb1f`.
  Tire slip uses longitudinal/lateral velocity; steering input is handled
  independently. Body orientation and velocity should not be treated as one
  angle. No GPL source, tire constants or implementation were copied.

## Validation

`node tests/v81-drift-world-heading.cjs` exercises 12 world-space heading cases:
left/right, curved/straight roads, multiple yaw angles, outward lateral momentum,
wheel steering and countersteering. It checks actual transformed mesh vectors
and that rendering leaves the source frame unchanged. GPU renderer is mocked.

V80 physics is compared using all seven deterministic replay cases, 108 frames
each: `DRIFT_BASELINE_INDEX=<V80 index.html> node tests/v56-drift-replay.cjs`.
No handling revision or leaderboard reset is required for this presentation fix.

The existing V80 surface art is retained. Further street/vehicle art work is a
separate next step. Browser WebGL is disabled in this execution environment;
world-space tests do not replace visual/play-feel acceptance on the user's device.
