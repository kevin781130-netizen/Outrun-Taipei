# P6 — Quaternius facade Level of Detail (LOD) — preview only

Status: **P6 code and deterministic mesh/LOD checks are ready. Real WebGL GPU and image acceptance is still pending.**

## Added

- `previews/quaternius-downtown/lod-policy.mjs`: pure LOD selector. At camera distance **28 preview units or more**, choose an inexpensive box proxy; return to complete Quaternius modules at **23 units or less** (hysteresis prevents flicker). Manual `near` and `far` overrides are available for comparison.
- `previews/quaternius-downtown/assembly.js`: retains the existing eight genuine CC0 detail modules in the near facade; creates a far visual proxy with **7 shared-geometry cuboids**, retaining building massing and approximate window locations. Changing a preset clears old Groups, while the geometry, materials and source GLTF textures remain shared. The near/far Groups are display-only; **not used for collision or road layout**.
- `previews/quaternius-downtown/assembly.html`: add auto/near/far controls, selected level, camera distance, predicted facade triangle counts.
- `tests/quaternius-lod.cjs`: deterministic LOD hysteresis tests, model triangle counts and isolation checks.

## Offline geometric triangle budget

| Preset | Near facade estimated triangles | Proxy estimated triangles | Estimated reduction |
|---|---:|---:|---:|
| Mixed street facade | 3,652 | 84 | 97.70% |
| Modern office facade | 3,220 | 84 | 97.39% |
| Brick residential facade | 4,084 | 84 | 97.94% |

The near totals include Quaternius modules and 36 triangles from the three box meshes; the proxy is seven untextured boxes (84 triangles). These are **geometry estimates**, not verified draw-call, VRAM, GPU or FPS improvements. In particular, material switches, WebGL overhead and pixels drawn can dominate frame time; **do not infer FPS from triangle savings**.

## Try / validate

With the art branch checked out:

```sh
node tests/quaternius-assembly.cjs
node tests/quaternius-lod.cjs
python3 -m http.server 8000
```

Preview URL: `http://localhost:8000/previews/quaternius-downtown/assembly.html`

For browser screenshots, actual texture verification and frame pacing, continue the P3/P5 Chromium workflow before any art replacement. Test zooming across both LOD boundaries on desktop and phone, observe seam/flicker, review light/dark, and compare draw calls and real frame time.

## Guardrails

- No edit to `main`, `index.html`, `src/rendering/`, physical road coordinates, Taipei stage composition, landmark identity, physics, traffic, collision, scoring, or gameplay.
- No modifications to Quaternius original geometry/binaries; visual proxy uses newly generated simple meshes only.
- No automatic staging into a race scene, deployed build, or Unity cutover.
- Do not claim visual appearance or performance acceptance without actual browser or hardware evidence.

**P6 stops at isolated LOD source/testing; further integration requires user confirmation.**
