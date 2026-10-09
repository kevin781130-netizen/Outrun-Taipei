# P13 — Full-resolution browser evidence ZIP for Taipei Quaternius art

**Track:** Shared art / isolated Quaternius browser preview.  
**Branch:** `art/quaternius-downtown-buildings-p1`.  
**Status:** Implemented and structurally checked. **No real WebGL screenshot has been captured or visually approved in the assistant environment.**

## Why

P12 could capture 24 actual standalone WebGL scene states, but distributed only a scaled 4×6 contact sheet and JSON. P13 preserves **all 24 individual original PNG captures**, and bundles them with SHA-256 checksums, the contact sheet, evidence JSON, and README. This permits inspection of Chinese glyphs, materials and clipping without loss from scaling down to a contact sheet.

## User path — no Actions/Playwright/npm needed

With the full private repo checked out and the correct isolated branch selected:

```powershell
git switch art/quaternius-downtown-buildings-p1
py -m http.server 8000
```

Open `http://localhost:8000/previews/quaternius-downtown/browser-review.html` in a **normal desktop browser**. Click:

1. **開始擷取 24 組畫面** — screenshot captures are produced by the user's own browser, using the independent Quaternius WebGL preview;
2. **一鍵下載 24 張原始 PNG＋報告 ZIP** — downloads a ZIP with all evidence locally.

Use the existing separate contact-sheet PNG and JSON download buttons if preferred. Share the ZIP for manual review. No external uploads or running gameplay occur; asset files are served from local `http://localhost`.

### ZIP layout

```text
images/p12-3-desktop-near-day.png
...
images/p12-7-mobile-far-night.png      # 24 scenario-named native-canvas PNGs
contact-sheet.png                      # 4×6 overview for browsing
SHA256SUMS.txt                         # 25 PNG SHA-256 hashes; paths relative to ZIP root
report.json                            # browser/scene/render stats, hashes, tests, warnings
README.txt                             # provenance and verification caveats
```

Total: **28 files**. The `report.json` is not included in `SHA256SUMS.txt`, because it embeds the checksums of the PNGs and contact sheet. The ZIP is **STORE/uncompressed**, with Unicode UTF-8 filenames, CRC32 and a normal central directory. The embedded PNG format retains its own compression; the ZIP wrapper does not recompress it.

Each scenario report includes input count (3/5/7), viewport class (desktop and emulated-mobile iframe), near/far mode, day/night lighting, captured PNG path and its hash, 12 short RAF intervals, renderer draw-call and triangle metrics, preview material mesh/texture references and pixel diversity heuristic.

The script additionally checks **24 pairs** in total:
- 12 near/far comparisons (3 building counts × 2 viewports × 2 light modes);
- 12 day/night comparisons (3 counts × 2 viewports × 2 LOD modes).

The pairwise metric is the **mean absolute RGB difference**, based on a common 48×32 downsample. A difference below 0.7 RGB levels raises a warning that the state toggle may not have visibly changed. These are *heuristics*, **not reliable proof of render correctness, material quality, font legibility, or game performance**. Actual screenshots must be examined by a human.

### Data integrity and privacy

- PNG bytes are created in a synchronous call to the existing preview bridge `canvas.toDataURL('image/png')`, then decoded locally into typed bytes.
- SHA-256 uses the browser Web Crypto API; `http://localhost` is a secure context in modern browsers.
- All 24 images, checksums and report stay in memory until the **user clicks download**.
- Filenames are controlled by an allowlist of deterministic P12 cases; ZIP writer rejects unsafe filenames, duplicate names and large unsupported ZIP64 archives.
- The user-provided Git commit SHA is **not cryptographically confirmed by the browser**; compare it to `git rev-parse HEAD` on the checked-out branch.
- Even if every automatic check passes, `humanVisualApproval` remains `false` until someone reviews actual images. Mobile viewport **emulation is not mobile-device testing**.

## Files and tests

- `previews/quaternius-downtown/evidence-zip.mjs` — pure browser ZIP STORE writer + CRC32.
- `previews/quaternius-downtown/browser-review.js` — store each original PNG and SHA-256, compute near/far and day/night visual warnings, build downloadable ZIP.
- `previews/quaternius-downtown/browser-review.html` — new one-click ZIP export control.
- `tests/quaternius-browser-evidence-zip.cjs` — ZIP structure, CRC32, UTF-8 Unicode filename, duplicate/path-traversal rejection and QA UI wiring checks.
- `tools/quaternius-p11-local-qa.cjs` — includes P13 test in static-only and full pipelines.

Static tests, in a full checkout of this art branch:

```sh
node tests/quaternius-browser-review.cjs
node tests/quaternius-browser-evidence-zip.cjs
node tools/quaternius-p11-local-qa.cjs --static-only
```

Do not claim a real screenshot or FPS pass from passing these unit tests alone. This is not a production game build.

**Protected:** no changes to `main`, gameplay, Taipei map, 15 routes, landmark IDs, road meshes, checkpoint/collision/vehicle physics, original entry point or deployed GAME-TEST-LAB website. P13 ends after this branch-only evidence improvement and waits for user confirmation.
