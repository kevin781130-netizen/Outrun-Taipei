# V59 · Independent arcade drift-haze experiment

Track: **Legacy Stable presentation-only experiment**, not a Unity WebGL release.

## Evidence and scope

- The user-provided OutRunners stage-35/36 toolkit establishes **static V70 instruction anchors only**. Its physics-verification status reports G0 PASS and G1–G7 unverified/blocked. Therefore no original drift, speed, collision, or camera formula is claimed or transplanted.
- [Waggles](https://github.com/thtbee/waggles) is a visual showcase. Its STRIX demo demonstrates that real-time effects benefit from pooling and coherent motion. The repository is **CC BY-NC 4.0**; no source, textures, geometry, shaders, or bundled assets have been copied here.
- This change independently reshapes the **existing** 24-instance rear-wheel smoke pool from the game's own `driving.slipAngleDeg`, `driftDirection` and `speedKmh`. It adds no random calls, geometry instances, physics writes or external dependencies. LOW mode retains 8 puffs.

## Protected

- Main `index.html`, road topology, 15 routes, scoring, traffic/collision, skid physics, nitro, and chase-camera authority remain untouched.
- Reuse the project's existing smoke mesh pool, frame-rate-independent smoothing, pause and disposal behavior.
- Rebuild the checked-in browser bundle from the exact modified source.

## Validation and next steps

- `npm test` and `npm run test:browser` must pass on PR CI before promotion.
- Inspect a **deployed build containing this branch** at 16:9 and mobile aspect ratios; a source diff or CI success is *not* visual acceptance.
- Larger scene architecture or gameplay redesign follows the parallel Unity Primary policy in `AGENTS.md`.
- Do not merge this experiment until test and actual visual review are accepted.
