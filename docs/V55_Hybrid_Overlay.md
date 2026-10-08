# V55 P3 — Opt-in Three.js WebGL overlay

**Track:** experimental browser presentation on `codex/v55-hybrid-render-foundation`. The current Legacy Stable game and its default entry point remain intact.

## How to try

Serve this branch as static files, e.g. from repository root:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/index.html` to try V55 3D by default. Add `?renderer=2d` to force the old Legacy Stable rendering path and skip Three.js.

The experimental page loads these files only on demand:
- `assets/vendor/three-r149.min.js` — pinned MIT-licensed Three.js r149, no CDN.
- `assets/hybrid-renderer.js` — reproducible browser bundle of `src/rendering/{VehiclePoseBridge,Vehicle3D,HybridOverlay}.cjs`.

The 3D layer is a transparent canvas placed over `#gameCanvas` and below the HTML HUD. It consumes the **existing** curve-limited `v51DriftVisualPose()`, chassis roll/pitch, steering, speed, brake and nitro state. It renders after `presentArcade()` using the same crop, camera lean, scale and lateral shift. It does not change driving physics, scoring, route choices, traffic, hitboxes or checkpoints.

The 2D vehicle draws until WebGL has rendered a successful frame. On unsupported WebGL, asset download failure, context loss, renderer exception, crash sequences, bike/truck selection and radio screen, the existing 2D rendering path is used. No automatic production cutover is made.

## Building and checking

```sh
npm ci
npm run build:hybrid
npm run check:hybrid
npm run test:pose-bridge
npm run test:vehicle-3d
npm run test:hybrid-overlay
npm test
npm run test:browser
```

The bundle builder has no external dependencies. The vendor file is pinned and carries its MIT notice; full terms are at `assets/vendor/THREE_LICENSE.txt`.

## Known limitations

- **Visual verification not performed** on deployed Web, and **deployment provenance unconfirmed** for the V55 branch. Check a genuinely deployed V55 build before accepting alignment or image quality.
- Browser/GPU tests, actual game FPS, mobile profiling and WebGL context-loss exercises still require a real browser run. The included tests exercise the scene/API contract using mocks, not actual GPU pixels.
- The hybrid model is deliberately a generic unbranded coupe regardless of regular 2D vehicle selection (except bike/truck, which fall back). Later work should map each vehicle selection to suitable 3D assets.
- The 3D car overlays traffic/roadside sprites instead of participating in their depth ordering. Proper 2D/3D occlusion is a future milestone.
- The position projection is calibrated geometrically, not yet manually visually approved for all 15 routes and viewport sizes. 3D render-rate targets remain unverified.
- The optional scripts are approximately 600 KiB plus local bundle before transfer compression. They load by default in V55; `?renderer=2d` bypasses the optional scripts.

## Handoff

- Core files: `index.html`, `src/rendering/HybridOverlay.cjs`, `assets/hybrid-renderer.js`, `tools/build-hybrid.cjs`, `tests/v55-hybrid-overlay.cjs`, vendored Three.js and license.
- The future parallel Unity track remains unaffected. No Unity project or WebGL build was created as part of this browser experiment.
