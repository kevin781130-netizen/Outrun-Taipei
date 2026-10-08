# V56.1 — DRIFT-01 / DRIFT-02 work in progress
Base main SHA: `f0c83a6fb4725b594d0e0e85506cdaeee92f113d`.

- Add reusable validated read-only `DrivingVisualSnapshot`, including yaw/slip degrees, normalized car-relative drift direction, lateral velocity in playerX units/s, grip and charge.
- The game is the only physics authority. Original `stepBrakeDrift`, `stepArcadeMotion`, scoring and `COMPETITION.version` must remain unchanged.
- Add bounded (0.4 world units) visual lateral sway and camera settling in `DriftVisualRig`. Never apply playerX twice or sum slip into precomputed V51 yaw again.
- DRIFT-00 seven-case deterministic replay added (Node/Skia run pending); DRIFT-03 camera overhaul, DRIFT-04 tire FX, DRIFT-05 gameplay/browser QA are **not complete**.
- **Visual verification not performed**; screenshot/Chromium drift interaction and mobile acceptance remain required. No main merge until that gate passes.
