# P4 — Quaternius Taipei-style facade composition (isolated)

**Status:** source implemented and isolated in `art/quaternius-downtown-buildings-p1`. **No browser/GPU visual approval is claimed.**

## Objective

Demonstrate that free Downtown City MegaKit building **parts** can be reused to assemble a coherent street-facing building without changing a single road, landmark, map coordinate, or gameplay mechanic.

## Implementation

- `previews/quaternius-downtown/assembly.html` — separate, responsive viewer; does not load `index.html` runtime.
- `previews/quaternius-downtown/assembly.js` — loads the four previously staged CC0 glTF models and clones their mesh scenegraphs as visual-only building modules.
- Three selectable schemes: mixed street frontage, modern metal/concrete frontage and red-brick frontage.
- Composition at preview-only origin: **10 m wide × approximately 6 m tall** with a 4m window + 2m entry + 4m window ground story and a second window/story plus three 2m × 1m infill panels. This is an illustrative module assembly, **not a Taipei landmark reconstruction**.
- A synthetic cuboid volume, parapet and doorstep backstop the CC0 facade pieces; those simple volumes are **preview-only** and not part of the original pack.
- Visual inspector shows module count, estimated triangle count, Three.js draw calls and preview `requestAnimationFrame` pacing; these are diagnostic only.
- `tests/quaternius-assembly.cjs` statically guards module identity and ensures no racing runtime source is referenced.

## Local usage

```sh
git switch art/quaternius-downtown-buildings-p1
python3 -m http.server 8000
# Browser: http://localhost:8000/previews/quaternius-downtown/assembly.html
node tests/quaternius-assembly.cjs
```

Keep running the **P3 Chromium acceptance harness** described in `docs/P3_Quaternius_Render_Acceptance.md` before claiming actual rendered compatibility, quality or performance. The staging sample is deliberately not auto-injected into V56 or any Unity primary migration.

## Non-goals and protection

- No `main` changes, deployment, asset replacement inside a race, navigation, driving physics, collision geometry, scoring, speed or checkpoint changes.
- No claim of Taipei map/geographical accuracy: the building exists only as a visual sample at local origin.
- No paid asset pack or third-party branded real architecture.
- No claim of actual desktop/mobile GPU FPS or deployed browser screenshot acceptance.

**Next protected gate:** real screenshot and frame-time validation, then user confirmation before any live runtime integration.
