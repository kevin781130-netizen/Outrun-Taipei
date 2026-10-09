# P14 — Quaternius source-fit facades, seam checks, and readable far-LOD signage

**Track:** Shared assets / **independent** Three.js preview; engine-neutral layout data can be transferred to a future Unity implementation after user approval.  
**Branch:** `art/quaternius-downtown-buildings-p1`.  
**Safety:** no edit/merge/deploy to `main`, production `index.html`, Taipei map, roads, landmarks, 15 routes, physics, collision, checkpoints or gameplay.

## What the original Quaternius CC0 source actually contains

Measured from **position accessor min/max** in the four staged original `.gltf` documents. No reinterpretation of model scale or modification of source meshes/textures.

| Original CC0 module | Source width (local X) | Height (local Y) | Approximate Z span |
|---|---:|---:|---:|
| `Brick_RedWhite_DoubleWindow` | 4m | 3m | -0.242 to 0.036m |
| `Metal_Window` | 4m | 3m | -0.224 to 0.000m |
| `DoorFrame_Trim` | 2m | 3m | -0.226 to 0.000m |
| `Brick_Plain_1` | 2m | 1m | -0.200 to 0.000m |

The original mesh nodes have identity transforms; the positions are directly usable as local preview coordinates. **The near facade consists of eight genuine Quaternius model instances:**

- Ground level 0–3m: left 4m window / center 2m door / right 4m window.
- Upper level 3–6m: left 4m window / center three stacked 2×1m wall pieces / right 4m window.
- Full module frontage: exactly 10m wide × 6m high; no GLTF geometry scaling or source asset editing.

`quaternius-facade-fit.mjs` provides a deterministic immutable layout and a **12-grid-cell seam audit** which checks both coverage and exact boundary alignment. The CI/static P14 test directly reloads the original 4 glTF files and checks their recorded dimensions and transforms, plus deliberate 30cm offset detection.

## Actual preview visual improvement

Before P14, switching an independent building to far LOD **removed Chinese shop text**: only colored sign boards remained. P14 adds:

1. **One two-quad shared-atlas sign mesh in each far proxy**, displaying the same shop name as the near model; still uses the P9 shared `1024×1024` atlas, not another texture per building.
2. **Two wide, color-alternating low-poly awning surfaces** instead of the near facade's nine thin segments; preserves Taipei arcade/storefront readability at greater distances.
3. HUD status for **8 snapped Quaternius modules / 10m×6m facade** and **shop text retained at both LOD levels**.
4. P12/P13 capture bridge exposes a `farSignPreserved` inspector flag. The independent Chromium art QA checks it when a runner/browser is actually available.

## Static polygon budget

Five-building default streetblock, includes three simplified roof tanks. These figures are **local geometry estimates**, not GPU/VRAM/FPS measurements.

| Building count | Near detail | Previous P8/P9 far proxy | New P14 far proxy |
|---:|---:|---:|---:|
| 3 | 12,948 | 564 | **648** |
| **5** | **21,124** | **936** | **1,076** |
| 7 | 30,164 | 1,308 | **1,504** |

P14 adds **28 triangles per shop** in far LOD (2 cuboids × 12 triangles + 2 sign quads × 2 triangles); Quaternius original near geometry is unchanged. The proxy costs a few extra triangles and may require an extra draw call to preserve shop name readability — no measured FPS improvement is claimed.

## Modified paths

- `previews/quaternius-downtown/quaternius-facade-fit.mjs` — new source-dimension local snap manifest and coverage/seam validator.
- `previews/quaternius-downtown/streetblock.js` — use source module placements, add far LOD names and low-poly awning, expose inspector status.
- `previews/quaternius-downtown/streetblock.html` — local preview metrics only.
- `tests/quaternius-facade-fit.cjs` — validate source GLTF dimensions, bounds, tile seams, far geometry budget, preview isolation.
- `tests/quaternius-streetblock.cjs` / `tests/quaternius-streetblock-browser.cjs` — corrected far budget; inspect far sign preservation when the real browser is available.
- `tools/quaternius-p11-local-qa.cjs` — add P14 to local static validation.
- `.github/workflows/quaternius-art-qa.yml` — add P14 static test and allow future `docs/P11+` art documentation in the branch-only safety boundary (the existing GitHub-hosted runner is still blocked).

## Test / visual gate

In a checked-out copy of the private art branch:

```sh
node tests/quaternius-facade-fit.cjs
node tests/quaternius-streetblock.cjs
python -m http.server 8000
```

Open `http://localhost:8000/previews/quaternius-downtown/streetblock.html`, switch **full / far** and **day / night** at 3, 5, 7 buildings. For 24 full-size screenshots, open `http://localhost:8000/previews/quaternius-downtown/browser-review.html` and export the P13 ZIP.

**Visual review NOT performed in this assistant runtime.** Check Chinese glyphs, placement against source geometry, seams between adjacent shops, clipping/penetration of awnings and signs, and frame time on a real GPU. GitHub Actions currently fails before allocating a runner; that is not a WebGL verdict. Production deployed visual provenance is unconfirmed.

**Stop after P14. Any game-world integration or merge still requires explicit user confirmation.**
