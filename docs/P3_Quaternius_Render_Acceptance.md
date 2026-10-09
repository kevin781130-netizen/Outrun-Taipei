# P3 — Quaternius building preview render / material / performance acceptance

Date: 2026-10-09 (Asia/Taipei)  
Target branch: `art/quaternius-downtown-buildings-p1`  
Parent baseline: `main` (V56; must remain untouched)  
Implementation: standalone `previews/quaternius-downtown/` only  
**Status: INCOMPLETE — actual rendered screenshots / FPS have not been collected in this execution environment.**

## Scope and protection

The P3 change creates a repeatable, isolated **real Chromium rendering and screenshot audit**. It does not enable Quaternius assets inside the racing game. No changes to `index.html`, `src/rendering/`, routes, map/corridors, landmarks, vehicle physics, traffic, collision or scoring are allowed. Unity-primary / existing-browser-safe repository rules still apply.

## Completed, direct evidence (GitHub source + asset inspection)

| Module | Triangle count (glTF index counts) | glTF primitive / material count | External geometry bytes |
|---|---:|---:|---:|
| Brick_RedWhite_DoubleWindow | 794 | 6 / 6 | 78,292 |
| Brick_Plain_1 | 4 | 2 / 2 | 440 |
| Metal_Window | 578 | 5 / 5 | 42,884 |
| DoorFrame_Trim | 860 | 4 / 4 | 54,600 |
| **Total (non-instanced)** | **2,236** | **17 / 17** | **176,216** |

All four expected 1K texture PNG files have a valid PNG signature and 1024×1024 IHDR dimensions:

- `T_RedBrick_BaseColor.png`
- `T_RedBrick_ORM.png`
- `T_MetalConcrete_BaseColor.png`
- `T_MetalConcrete_ORM.png`

The four staged glTF JSON files contain a scene, one mesh per module, valid texture indexes, matching external geometry buffer sizes and no missing external resource names. These are **static asset checks**, not proof that the graphics display properly. Geometric counts do **not** predict on-device FPS.

## Added in P3

1. `tests/quaternius-render-acceptance.cjs`: a standalone Chromium/Playwright HTTP-server audit. Iterates four materials/models × three viewport profiles × day/night, tests loaded WebGL meshes and decoded runtime texture images, captures 24 canvas images, tracks console/network errors, samples 90 animation frames for 12 frame-pacing profiles, and writes `test-results/quaternius-p3/report.json`.
2. `previews/quaternius-downtown/preview.js`: adds read-only `window.__quaterniusPreviewProbe()` exposing *preview-only* mesh/texture-loaded status. No changes to appearance or gameplay.
3. This report. Nothing is deployed or merged to main.

## Run the **actual** local browser acceptance

Requirements: checkout this branch, Node.js 22+, `npm ci`, Chromium/Playwright.

```sh
git switch art/quaternius-downtown-buildings-p1
npm ci --no-audit --no-fund
node tests/quaternius-preview.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/quaternius-render-acceptance.cjs
```

On Windows, omit `CHROMIUM_PATH` if the bundled Playwright Chromium is installed (`npx playwright install chromium`).

Output (generated locally, **not** committed):
- `test-results/quaternius-p3/report.json`
- `test-results/quaternius-p3/*.png` (24 images; 3 viewport profiles × 4 modules × 2 lighting moods).

Visual checklist for **each** screenshot: visible 3D mesh, correct brick/metal colors, loaded PBR maps, usable light/dark contrast, no empty/black patches or shader artifacts, model wholly within canvas, no clipping on mobile, functional interaction and no material seams. Record any failures before replacing game art.

### Performance interpretation

The harness explicitly starts Chromium with **ANGLE SwiftShader**, so the results are **environment-specific software GPU frame-pacing evidence**, **not** native mobile GPU FPS, *not* deployed website FPS, and not a full racing simulation benchmark. It reports FPS, mean/P95 frame interval, frames over 33.33ms and draw calls, without manufacturing performance pass thresholds. Measure on the same machine and browser for comparisons; then perform real mobile/desktop hardware tests before integration.

### Acceptance gate

| Gate | Current status |
|---|---|
| Staged CC0 four-module glTF references / asset header checks | PASS (static) |
| Preview code uses separate HTML entry; actual racing runtime unchanged | PASS (GitHub source diff) |
| Chromium page loads and actually renders all four modules | NOT RUN / NOT VERIFIED |
| Day/night screenshots inspected for correct materials | NOT RUN / NOT VERIFIED |
| Desktop and mobile-size browser frame-pacing measurements | NOT RUN / NOT VERIFIED |
| Hardware WebGL/real phone performance | NOT RUN / NOT VERIFIED |
| Deployed screenshot matches test commit | NOT DEPLOYED / NOT VERIFIED |

**Reason for missing real-browser evidence:** the execution environment can inspect and update the private repository via the GitHub connector but cannot materialize/clone its asset tree into the local Chromium runtime. A local Chromium installation alone is not evidence that it rendered the repository's meshes. GitHub Actions execution was not substituted for a run.

**No P3 visual or performance pass is claimed.** Pause for user confirmation before further asset integration or production changes.
