# V70 — Near-field traffic-car visual convergence

## Scope / actual findings
The existing traffic mesh has a single rectangular chassis and glass roof, wheel boxes and tail lamps. Near-field silhouettes lack headlamp/window/fascia cues even though full Three.js terrain and perspective are already present. V70 **does not change** the road camera, projection, original Taipei routes, car positions, collision bounds, scoring, steering or ranked/default visuals.

## Preview-only implementation
- The 15 pooled 3D traffic mesh groups each receive seven small additional trim meshes: windshield, two side windows, two front headlamps, grille and rear bumper trim. They reuse the existing box geometry and shared glass/paint materials, plus two scene-owned common trim materials.
- Enabled **only when** `trafficVisual70===true` on the existing opt-in `?trafficAI=v60` Cruise presentation frame, and **only for visible traffic at distance 0–42 road segments**; it is disabled for default/ranked or distant cars.
- Original chassis/wheel geometry and widths unchanged; accents fit inside the original vehicle envelope. No texture downloads, outside code, new gameplay RNG, collisions or route edits.
- Generated `assets/hybrid-renderer.js` must exactly match `tools/build-hybrid.cjs --check`.

## Acceptance and evidence
- Expanded `tests/v60-traffic-visual.cjs` asserts the real Three.js detail-group structure, near-only visibility, far-field LOD suppression, exact default/ranked visual fallback and unchanged yaw/frames, with mocked GPU.
- New `tests/v70-traffic-quality-browser.cjs` uses actual Chromium/SwiftShader rendering and **same-frame A/B** preview detail OFF/ON/OFF screenshots for Taipei 1A city, 4B mountain and 5B coastline (three screenshots each). PNG differences are decoded with the existing `@napi-rs/canvas` dependency; the near-car region must visibly change, while opting out must restore baseline pixels. Every screen has a JSON manifest, SHA-256, changed-pixel count and screenshot.
- Existing 15 route / 27 landmark, V69 traffic animation/collision, and V68 CPU A/B regression stay mandatory.

**Limitations:** visual geometry improvement is measurable, but beauty/art direction requires human screenshot review. CI software WebGL GPU is not representative of real phone FPS. No PR merge/publication authorization.
