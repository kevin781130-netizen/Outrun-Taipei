# V56.1A — Whitebox/steering visual playtest

## Evidence from player screenshots (2026-10-09)
- 1A daytime/nighttime-like scene still looked like large white blocks with isolated blue faces and a near-black street; player cars appeared simple. User screen #2 showed a major sideways car pose at 87 km/h on a visually straight route.
- These are user screenshots of the deployed Web page, **before this patch**. They are not after-fix screenshots.

## What changed
- **ART P0 CityKit**: `src/rendering/CityKit.cjs` creates six bounded InstancedMesh families for actual road-facing windows, multi-floor balcony bands, colorful original (no brand) storefronts/sign fascias, shaded canopies, and rooftop utilities. Main facade palette is blue-gray/brick/sage instead of washed-out white.
- **Contrast fix**: physical road strips lack computed vertex normals, so changing those to controlled-color MeshBasicMaterial prevents fully black asphalt from depending on lighting; main building blocks use instance-colored MeshBasicMaterial with tone mapping disabled, and total lights/exposure are toned down.
- **DRIFT-visual**: `src/rendering/DriftPresentation.cjs` caps rendered 3D yaw according to road curvature and speed, while leaving the entire driving simulation, scoring, `COMPETITION.version`, user records and V51 drift yaw untouched. A 30° gameplay visual yaw on a straight 87-km/h stretch renders at ~11.2°. A sustained tight bend at 220 km/h permits ~25.6°.
- **Chase framing**: centerline look-ahead replaces raw key-driven target aim; speed-smooth FOV is clamped to 64–72°.
- Browser build tag becomes V56.1A **only after the new renderer successfully initializes**, keeping the static fallback V56.0 HTML untouched.
- All work uses original procedural 3D geometry; no imported maps, assets or trademarks. Main's pinned vendor Three.js r149 is unchanged.

## Verification
- Direct V8 execution of **real vendored Three.js r149** with GPU renderer stub: geometry and instancing created successfully; urban test yielded 2,155 window panels and 80 each shops/canopies/roofs; colors were non-white, road strips used MeshBasicMaterial, and slow/high-speed yaw matched 11.2°/25.61°. A 1280×800, 844×390 scene test invoked two render frames and disposed without exception.
- Added self-contained Node regression `tests/v56-city-kit.cjs` and `tests/v56-drift-presentation.cjs` to npm test. Syntax checks and mocked GPU are not real WebGL visual verification.
- **Visual verification not performed on the after-patch build**; GitHub Actions runner allocation unavailable due exhausted usage allowance. Player must compare real screenshots; performance/FPS also remain to be measured on hardware.

## Safe playtest/deployment rules
- Source work isolated at `fix/v56-1a-whitebox-drift-camera`, based on source Main `4618545a`; do not merge before new screenshot/controls approval.
- Publish the three required static files to public GAME-TEST-LAB playtest directory without overwriting unrelated games; record public commit and source SHA.
- Revert the public game folder from the previous public commit if visual regression occurs.
