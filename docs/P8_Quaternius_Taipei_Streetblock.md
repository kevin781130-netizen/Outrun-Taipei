# P8 — Independent Quaternius Taipei-style five-shop block

**Track:** independent shared-art preview (engine-neutral placement plan; optional future Unity Primary transfer).  
**Branch:** `art/quaternius-downtown-buildings-p1`.  
**Status:** P8 source prepared and reviewed statically; **no real browser screenshot, hardware GPU benchmark or deployed visual validation has passed**.

## Deliverable

An entirely separate WebGL preview combines the P7 CC0-backed single storefront into a continuous **3 / 5 / 7 shop local block**, defaulting to **five shopfronts**. It does **not** import, replace or redefine any Taipei city coordinates, road mesh, map, landmarks, race course, checkpoints, traffic, collision or gameplay.

- `previews/quaternius-downtown/streetblock-plan.mjs`: deterministic, immutable and engine-agnostic plan. Building pitch 10.85m, facade width 10.35m (0.50m gap). Example sample shop labels are fictional (e.g. 北街食堂、拾光茶屋、拾頁書屋、巷弄雜貨、禾日花房).
- `previews/quaternius-downtown/streetblock.js`: load the **same four staged Quaternius Standard CC0 glTF modules** once, clone into independent facade groups, reuse the P7 pure Taipei frontage descriptor for 51 decorative near boxes and 8 far boxes per building, draw Traditional Chinese storefront signs to runtime canvas textures. Some rooftops get a simple **art-preview rooftop water tank** (procedural cylinder + supports).
- `previews/quaternius-downtown/streetblock.html`: preview with 3/5/7 shop counts, mouse/touch OrbitControls, day/night, independent near/far/automatic LOD per building, and on-page live renderer diagnostics.
- P8 preview batching uses Three.js `InstancedMesh` for grouped facade decorative boxes; it still creates Quaternius geometry instances/clones individually. **The draw-call and FPS benefit is hypothetical until real WebGL capture is performed.**
- `tests/quaternius-streetblock.cjs`: deterministic count/spacing/identity/triangles/asset dependency and runtime isolation checks.
- `tests/quaternius-streetblock-browser.cjs`: browser-only smoke: 3/5/7 counts at desktop and mobile emulation; plus 8 screenshot states (five-shop block × full/proxy × day/night × desktop/mobile), software GPU frame-pacing and draw-call capture to `test-results/quaternius-p8/`.
- The art-branch-only PowerShell QA runner also invokes both P8 audits. No new game deployment or browser start occurs automatically.

## Static local-space geometry budgets

These are geometric triangle calculations, **not measured GPU savings**.

| Facade count | All complete buildings | All distance proxies |
| ---: | ---: | ---: |
| 3 | 12,948 | 564 |
| **5 (default)** | **21,124** | **936** |
| 7 | 30,164 | 1,308 |

The budgets include original Quaternius windows/wall/entry modules, P7 ornament instancing and sign planes, roof details, and box backdrops. No scene-depth occlusion factor is applied. The `InstancedMesh` shader/material batching may reduce some CPU-side submission overhead but GPU measurements are needed.

## Run / inspect

On the named art branch only, from the root of a checked-out copy:

```sh
node tests/quaternius-streetblock.cjs
python3 -m http.server 8000
```

Open **http://localhost:8000/previews/quaternius-downtown/streetblock.html**.

For headless Chromium evidence (requires Chromium and installed `playwright`, `@napi-rs/canvas` dependencies):

```sh
node tests/quaternius-streetblock-browser.cjs
```

On Windows, `powershell -ExecutionPolicy Bypass -File .\tools\run-quaternius-qa.ps1` covers P3/P7/P8 together.

### Visual/hardware acceptance still required

Check (1) all five shop signs show legible Traditional Chinese and are correctly mapped, (2) awnings/rooftop tanks do not clip neighboring buildings, (3) independent LOD switches do not visibly jump, (4) both browser/mobile viewports frame the whole preview, (5) night lighting is legible, (6) draw calls, loading cost and frame times on native GPU, (7) no WebGL console failures. The browser test's SwiftShader numbers are **not native mobile GPU FPS**, and screenshot heuristics do not constitute human visual sign-off.

## Protected invariants

GitHub comparisons must prove there is no change to `main`, `index.html`, `src/`, map/road/stage files, landmarks, collision, physics, vehicle controls, traffic, records or scoring. This sample is **not a road scene or georeferenced Taipei map**. No replacement/build promotion to official `GAME-TEST-LAB` URL or Unity release occurs in P8.

**Stop after P8 and wait for user approval before additional art integration.**
