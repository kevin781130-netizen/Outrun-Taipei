# V56.1 — DRIFT-01 / DRIFT-02 work in progress
Base main SHA: `f0c83a6fb4725b594d0e0e85506cdaeee92f113d`.

- Add reusable validated read-only `DrivingVisualSnapshot`, including yaw/slip degrees, normalized car-relative drift direction, lateral velocity in playerX units/s, grip and charge.
- The game is the only physics authority. Original `stepBrakeDrift`, `stepArcadeMotion`, scoring and `COMPETITION.version` must remain unchanged.
- Add bounded (0.4 world units) visual lateral sway and camera settling in `DriftVisualRig`. Never apply playerX twice or sum slip into precomputed V51 yaw again.
- DRIFT-00 seven-case deterministic replay added (Node/Skia run pending). DRIFT-05 now has a dedicated Playwright Chromium/WebGL test for keyboard left/right drift, physical yaw vs actual Three.js scene yaw, sway, countersteer recovery, nitro and exhaust flames; its actual execution remains pending. DRIFT-03 camera overhaul and DRIFT-04 tire FX are not complete.
- **Visual verification not performed**; screenshot/Chromium drift interaction and mobile acceptance remain required. No main merge until that gate passes.

## Browser acceptance introduced
- `npm run test:drift-browser` or the existing `npm run test:browser` gate (runs new test after prior suites).
- The test response alone injects a read-only lexical diagnostic hook. Three.js is observed via `Object3D.updateMatrixWorld`, without a shipped test API or physics changes.
- Artifacts from an actual run: `test-results/v56-drift-browser/right.png`, `left.png`, `boost.png`, and `verification.json`.
- **Visual verification not performed; deployment provenance unconfirmed.** Do not treat syntax checks, mock GPU tests, or screenshots generated but not reviewed as visual acceptance.
