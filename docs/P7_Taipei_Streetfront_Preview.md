# P7 — Taipei-inspired Quaternius streetfront detail kit (preview-only)

## Status and safety

**Track:** Shared art source / standalone Three.js preview (render-engine-neutral plan data, reusable later in Unity Primary).  
**Branch:** `art/quaternius-downtown-buildings-p1`.  
**Status:** Implemented and checked for JS syntax + deterministic local-placement bounds; **actual browser image, Chinese glyph display and GPU FPS not verified**.  
**Protection:** No change to `main`, production `index.html`, `src/`, Taiwan/Taipei routes, geolocation, landmarks, checkpoints, collisions, physics, traffic or scoring.

## Creative direction

Use real Taipei street vocabulary **without copying a landmark or existing shop identity**:

- Covered sidewalk arcade / **騎樓** visual rhythm: corner support columns and a projecting canopy. This is **only geometry**; it does not create a traversable game sidewalk.
- Alternating-color rain awning and low fascia to break up generic city-kit uniformity.
- Fictional, original **Traditional Chinese** shop labels and a small vertical side sign, generated at runtime using a CanvasTexture (no external fonts or trademark logos).
- Upper-floor metal balcony/guardrail, air-conditioner compressor and grille, small rainwater pipe.
- Localized materials and accents. The existing free CC0 Quaternius walls, windows and doorway remain intact.

Original fictional preview-only shop profiles:

| Existing preview style | Chinese fascia text | Color / mood |
| --- | --- | --- |
| `mixed` | 巷口食堂 | warm brick + red rain awning |
| `metal` | 街角茶舖 | teal metal storefront |
| `brick` | 日常雜貨 | pale brick + ochre awning |

Taipei visual references were **consulted for architectural rhythm only; no imagery was copied or imported**:
- https://www.travel.taipei/zh-tw/featured/details/18490 (Taipei Travel, Dihua Street heritage facades)
- https://www.travel.taipei/zh-cn/pictorial/article/22691 (Taipei pictorial, storefront typography)
- https://www-ws.gov.taipei/Download.ashx?icon=..pdf&n=MjAyMy0yMDI06Ie65YyX5biC5bu656%2BJ566h55CG6ZuZ5bm05YiK0VuZ2xpc2gucGRm (Taipei official city arcade improvements; reference only)

## Code files

1. `previews/quaternius-downtown/taipei-streetfront.mjs` — **pure, immutable, engine-agnostic** presets and local-space near/far geometry descriptors. No Three.js import and no game-map data.
2. `previews/quaternius-downtown/taipei-streetfront-renderer.mjs` — Three.js r149 preview adapter that builds cuboids from shared geometry/materials and rasterizes each fictional sign as an in-memory CanvasTexture.
3. `previews/quaternius-downtown/assembly.js` — attaches P7 detail to the existing independent Quaternius building prefab and both P6 LOD groups. Lighting toggle also adjusts the **accent-only** emissive strip; existing Quaternius materials are not changed.
4. `previews/quaternius-downtown/assembly.html` — relabels the 3 presets and adds visible identifiers and decorative-object counts.
5. `tests/quaternius-taipei-streetfront.cjs` — deterministic placement, immutable profile, polygon-budget and preview-isolation checks.
6. `tests/quaternius-taipei-browser.cjs` — isolated Playwright audit for all 3 streetfront presets × near/far × day/night × desktop/mobile = **24 evidence PNGs**, with status, draw-call, polygon and frame-time records. It is a **runnable harness**, not a passed test.
7. `tools/run-quaternius-qa.ps1` — adds both P7 static and P7 real-browser audits to the branch-guarded Windows runner.

## Geometry estimate — per **single** demonstration facade

Baseline includes existing P6 Quaternius near facade (8 genuine modules + 3 cuboids) and 7-cuboid proxy.

| Style | Baseline near | P7 additions (51 boxes + 2 sign planes) | P7 near total | P7 far total (7+8 boxes) |
|---|---:|---:|---:|---:|
| Mixed | 3,652 | 616 | 4,268 | 180 |
| Metal | 3,220 | 616 | 3,836 | 180 |
| Brick | 4,084 | 616 | 4,700 | 180 |

Proxy geometry reduction relative to P7 near: **approximately 95.3%–96.2%**. The full Quaternius geometry and textures remain loaded in both modes. No claims are made about draw-call reduction, WebGL memory, actual FPS, map-fit, or player-view visual quality.

## Validation and manual inspection

On this art branch, run:

```sh
node tests/quaternius-preview.cjs
node tests/quaternius-assembly.cjs
node tests/quaternius-lod.cjs
node tests/quaternius-taipei-streetfront.cjs
node tests/quaternius-taipei-browser.cjs
python3 -m http.server 8000
```

Inspect the **standalone** page at: `http://localhost:8000/previews/quaternius-downtown/assembly.html`.

Review all 3 styles in desktop and mobile viewports, with day/night and both `near` / `far` LODs. Verify that **Traditional Chinese glyphs render correctly on the tester's installed fonts**, shop text is readable, there are no intersecting balconies or missing AC parts, arcade columns don't visually block the main door, night emissive is not overblown, and the facade is fully in frame. Capture real screenshots and compare draw calls and frame pacing. The P7 browser harness separately captures the **combined facade** to `test-results/quaternius-p7/report.json` and 24 PNGs, while the existing P3 Chromium QA exercises the four base modules. These scripts have **not been executed successfully in the assistant environment**; screenshots and browser FPS remain unverified.

### Remaining gate

Do **not** integrate the P7 artwork into the racing scene, push to production, merge to `main`, or claim a verified Taipei streetscape until user approval and actual visual inspection of a deployed preview. Original game behavior and map remain canonical.
