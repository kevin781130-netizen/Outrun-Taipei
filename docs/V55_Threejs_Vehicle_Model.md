# V55 P2 — Original Three.js Vehicle Model

## Scope
- Adds `src/rendering/Vehicle3D.cjs`, a procedural unbranded arcade coupe based on real Three.js primitives.
- Separates chassis, hood, roof, glazing, four rubber tyres and alloy wheels, head/tail lights, rear wing, two nitro exhausts, and simple contact shadow.
- Uses PBR `MeshPhysicalMaterial` paint (metalness + clearcoat); LOW mode disables clearcoat.
- Vehicle orientation and wheel animation consume the immutable-frame output of `VehiclePoseBridge.cjs`.
- Only the front wheel pivots steer. All four wheels spin. Brake lights and nitro geometry respond to pose flags.
- Geometry and materials are reused throughout each model's lifetime and explicitly disposed on teardown.

## Existing game preserved
- `index.html`, physics, player position, collision volumes, routing, timer and scoring are **unchanged**.
- The car model's `root.position` is intentionally not updated from `screenX/screenY`: those values are 960×540 2D arcade coordinates. The **future renderer** must map those to its own camera/world-space coordinates correctly.
- No CDN dependency, runtime Three.js download, bundled renderer or WebGL overlay is added at this step. The next milestone supplies a pinned Three.js bundle and the layered canvas integration.
- The current playable version is still the existing Canvas implementation.

## Verification
Run `npm run test:vehicle-3d`, `npm run test:pose-bridge` or `npm test`.
`tests/v55-vehicle-3d.cjs` uses Three.js-compatible scene API mocks for deterministic structure, animation, material-state, hot-path allocation-count and dispose tests. These tests **do not render actual pixels or confirm GPU/WebGL behavior**.

Visual verification not performed: this module is not yet wired into the playable game.
Deployment provenance unconfirmed for V55 because V55 is isolated on a development branch.
