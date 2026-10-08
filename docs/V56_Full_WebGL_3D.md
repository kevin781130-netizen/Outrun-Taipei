# V56.0 — Full WebGL 3D renderer

## Diagnosis
The earlier V55 release combined the legacy 2D Canvas road (including a tall block-like legacy player sprite) with a transparent Three.js car overlay. When the overlay failed or was not ready, the large 2D vehicle was displayed. This was not a full 3D game.

## Replacement
- New `src/rendering/Full3DScene.cjs` renders road meshes, stripes, verges, three-dimensional traffic, buildings, vegetation, pole meshes, a real perspective camera, atmosphere, and the player car in one **WebGL Three.js scene**.
- Player car has low-slung proportions and uses the configured vehicle color. World forward direction is **-Z**: headlights are at negative Z, rear brake lights at positive Z; the chase camera is behind at positive Z, eliminating the reversed-facing ambiguity.
- Road geometry is reconstructed from existing `segments[].curve`, elevation data, `roadCorridors()`, the actual `playerX`, and existing simulated traffic. This does not replace handling, collision detection, nitro, routing, or score physics.
- Legacy `projectRoad()` / `prepareTrafficSprites()` are invoked solely to maintain old collision/near-miss projection data, NOT to paint a 2D game to the screen.
- The 2D game canvas is hidden. If WebGL fails, the screen presents a diagnostic message instead of showing the old 2D car. There is no player-accessible 2D fallback option.
- The historical 2D renderer remains unmodified in Git and can be tested only by the injected `__legacyRegression` flag used by test harnesses, not by public URL query.

## Scope and limits
This replaces the rendered **world** with 3D, but it does not yet recreate every historical landmark as a bespoke 3D mesh, does not implement a real-world geographic Taipei network, and does not change 2D DOM HUD (regular game UI). Existing route identities/stages still drive geometry and themes. Performance varies by GPU.

## Verification
- Pinned Three.js r149, no remote CDN.
- Unit contracts: `npm run test:full3d`, `npm run test:vehicle-3d`, `npm run test:pose-bridge`, `npm run check:hybrid`.
- Full suite: `npm test`.
- Browser acceptance **still required**: `CHROMIUM_PATH=/usr/bin/chromium npm run test:full3d-browser` (desktop, narrow portrait and landscape); screenshots then manually review car shape/direction, road-contact, HUD and traffic.
- **Visual verification not performed in this tool environment.** No acceptance claim can be made from module/API checks alone.

## Rollback
Use the previous main SHA before the V56 merge or its backup ref. The V55 and V54 versions remain in Git history.
