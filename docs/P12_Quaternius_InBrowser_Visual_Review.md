# P12 — In-browser Quaternius visual review (no hosted runner)

**Track:** independent shared-art preview, browser-based QA UI.  
**Target branch:** `art/quaternius-downtown-buildings-p1`.  
**Source status:** implemented with static guards, **not yet visually verified by a real browser**.  
**Production status:** NOT merged, NOT deployed, NOT incorporated into Taipei game.

## Why P12

P10/P11 GitHub-hosted jobs repeatedly failed before runner allocation (Runner ID 0, zero steps). This P12 visual review uses the **user's normal browser** against a full local checkout of the already imported Quaternius CC0 models. It does not depend on GitHub Actions runners, Playwright, npm, headless Chromium or external fonts.

## User-facing test

From your Windows project root, with the private art branch checked out:

```powershell
git switch art/quaternius-downtown-buildings-p1
py -m http.server 8000
```

If Python is installed as `python` instead of `py`, use `python -m http.server 8000`.

Open **http://localhost:8000/previews/quaternius-downtown/browser-review.html** in a normal desktop browser.

Click **開始擷取 24 組畫面**, then save the **PNG contact sheet** and **JSON report**. The page loads only `./streetblock.html` as a same-origin iframe, cycles **3/5/7 buildings × desktop (1280×800)/mobile emulator (390×844) × near/far × day/night**, captures the actual WebGL canvas synchronously after `renderer.render()`, samples 12 animation frame intervals per state, draws a 4×6 contact sheet, and exports a report with per-scenario game-independent geometry/render info.

The quality gate is still manual: inspect all 24 cells to verify Traditional Chinese signs, texture appearance, roof tanks, arcade columns, balcony clipping, framing and near/far transitions. **Please provide both contact-sheet PNG and JSON report** when asking for the next visual acceptance judgment.

## New files

- `previews/quaternius-downtown/browser-review.html` — user-friendly QA UI with live embedded preview and local export buttons
- `previews/quaternius-downtown/browser-review.js` — controls the **same-origin iframe only**, samples its screenshot/metrics, and produces downloadable evidence
- `previews/quaternius-downtown/browser-review-matrix.mjs` — deterministic 24-case layout and pixel-diversity heuristic
- `previews/quaternius-downtown/streetblock.js` — `window.__quaterniusArtQA` bridge (readiness, choose count/LOD/light, synchronous canvas capture); this exists **only** on the independent art preview page
- `tests/quaternius-browser-review.cjs` — Node structural tests checking scenario completeness, sheet layout, bridge and gameplay isolation
- `tools/quaternius-p11-local-qa.cjs` — includes the P12 structural test and required preview-file preflight

## Evidence interpretation

- **Real image pixels:** captured inside the user's browser if and only if the user actually runs the review UI. Not yet obtained by the assistant.
- **Report status:** `CAPTURED — HUMAN VISUAL REVIEW REQUIRED` or `INCOMPLETE`. Never promotes pixel diversity to a claim of visible quality.
- **Pixel heuristic:** distinct color buckets only; can detect some blank screenshots but cannot validate facade, glyphs, collisions or lighting quality.
- **Reported browser timing:** sampled `requestAnimationFrame` on the preview frame, not a benchmark of the real game, a measured GPU render time or a physical mobile device.
- **Mobile coverage:** virtual 390×844 iframe viewport in a desktop browser; it is **not a mobile device**.
- **Provenance:** commit SHA in the form is *operator-entered*, not verified by the page. If left empty, report marks provenance unknown. Confirm `git rev-parse HEAD` when interpreting captures.
- **Export:** two explicit local downloads, one PNG contact sheet and one JSON evidence report; no uploads or network transmission beyond loading locally served project files.
- **Source safety:** no access to `index.html` game runtime, map files, roads, landmarks, physics, score or collision data.

## Static testing

```sh
node tests/quaternius-browser-review.cjs
node tools/quaternius-p11-local-qa.cjs --static-only
```

The second command requires the full checkout and branch and may run other existing art-only tests. It never switches or pushes Git branches.

Do not merge, deploy or attach Quaternius building art to game routes until actual rendered screenshots have been reviewed and the user explicitly authorizes the integration.
