# V56 — Kenney CC0 streetscape, phase 1

## Track and scope
**Legacy Stable, isolated Draft PR.** Preserve the existing Taipei 15-route identities, procedural road and corridor geometry, physics, collisions, player movement, traffic mechanics, drift, HUD, timers, scoring, and web entry point. Unity Primary is unchanged.

## Assets actually embedded and rendered
- **Kenney City Kit Roads 2.0 — `light-square.obj`**, 120 triangles. Primary publisher: https://kenney.nl/assets/city-kit-roads . Reproduced from https://github.com/petroulacl/fps-buildings-env-kit/blob/main/props/kenney-city-kit-roads/Models/OBJ%20format/light-square.obj , Git blob `566fbc00dd82066f73ca8c2e33ad6f3d7c1b1df8`.
- **Kenney City Kit Suburban 2.0 — `tree-small.obj`**, 84 triangles. Primary publisher: https://kenney.nl/assets/city-kit-suburban . Reproduced from https://github.com/petroulacl/fps-buildings-env-kit/blob/main/buildings/kenney-city-kit-suburban/Models/OBJ%20format/tree-small.obj , Git blob `df01945b2afed921328e82c0034c49dae9fa3502`.

**License:** Creative Commons Zero 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/ . The two upstream `License.txt` pack documents explicitly allow commercial use and do not require credit. Copyright owner / creator: Kenney (www.kenney.nl). Attribution here is provided voluntarily.

`src/rendering/KenneyStreetAssets.cjs` embeds the original OBJ geometry text, decodes faces into `THREE.BufferGeometry`, bakes source UV palette groups into light vertex colors, and is included in `assets/hybrid-renderer.js` at build time. Rendering uses `THREE.InstancedMesh` (one tree batch and one lamp batch). No CDN or new loader required.

## Placement and budget
- Urban tree instances use existing `previewPoints(frame)` centrelines, world-space roadside offsets, and deterministic route seed. Rural routes retain trees, now using the Kenney mesh.
- Street lamps are rotated to point inward toward the road, using the existing segment heading.
- All are **visual only**; no additional colliders or new gameplay state. The material/geometries are cached for each scene and disposed with the renderer.
- Keep `InstancedMesh` caps at 120 trees / 50 lamps. Avoid per-frame GLTF parse/network or unbounded objects.
- The actual 3D road still derives exclusively from the game's current gameplay route segments; no purchased/free road pieces replace it.

## Verification gates
Run `npm test` (including new V56 assertions and bundle check) and `npm run test:browser` in CI. For final artwork acceptance, use desktop and mobile screenshots of a browser build **verified to include this PR SHA**, compare FPS/draw-call budget, and visually inspect for road clipping and tree/building overlap.

**Visual verification has not been performed.** There is no claim that this draft branch is deployed. **Deployment provenance unconfirmed** for public GAME-TEST-LAB until merge/controlled deployment. Main remains unchanged.

## Future phases (not done)
Assess CC0 Kenney City Kit Commercial façades / Quaternius Downtown City objects and Poly Haven / ambientCG textures. Only use them where they fit Taipei identity and retain route-specific landmarks. Do not alter map or gameplay without a separate explicit request.
