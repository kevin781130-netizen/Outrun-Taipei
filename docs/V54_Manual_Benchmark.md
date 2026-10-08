# V54 — Manual Performance Baseline (No GitHub Actions)

This task is deliberately **manual-only**. Do not start, depend on, or wait for GitHub Actions. The released V53.1 game stays unchanged on main; the V54 branch contains experimental renderer optimizations.

## Preconditions

- Node.js 22+; `npm ci` (or `npm install` where the lockfile requires it).
- Chromium installed locally or via Playwright.
- Shell working directory is the repository root.
- Close other resource-heavy workloads. Use the same machine, Chromium build, viewport and sampling parameters for both measurements.

## Baseline and comparison

```sh
# Run on branch v54-performance-foundation (the version with V54 tooling).
npm ci --no-audit --no-fund

# Freeze the original V53.1 HTML from main.
git show main:index.html > /tmp/outrun-v53.1.html

# Use CHROMIUM_PATH only if Playwright's browser cannot be launched.
# Example on Linux: export CHROMIUM_PATH=/usr/bin/chromium

PERF_INDEX=/tmp/outrun-v53.1.html PERF_OUTPUT=test-results/v53.1-before.json npm run test:performance

# Run after a V54 code optimization has changed index.html.
PERF_OUTPUT=test-results/v54-after.json npm run test:performance
node tools/compare-performance.cjs test-results/v53.1-before.json test-results/v54-after.json > test-results/compare-v53-v54.json
```

Experimental renderer changes are committed on the V54 branch. **No measured improvement can be claimed until real same-machine Chromium benchmarks are recorded.** Verify sourceSHA256 in each report.

## Measured

- **30 fixed scenes:** 15 Taipei routes × sunset/neon, segment 200, speed 220.
- **CPU render:** warmup 20, default 60 timed draws per scene, mean and P95.
- **RAF frame pacing:** real browser animation callbacks with render; *no update loop*, so not full gameplay FPS.
- **Memory:** 3 full scene cycles with GC and Chromium JS heap used; does not capture GPU memory or total RSS.

The comparison rejects mismatched browser versions, viewports, samples or scene states and reports both per-scene regressions and aggregate render improvement. The V54 target is **at least 20% aggregate render-time improvement**, with no severe route regressions. Do not claim phone 30 FPS, desktop gameplay 60 FPS, no leaks, visual correctness or production acceptance from these headless measurements.

## Status

- Baseline tools added to a separate branch.
- Main still hosts V53.1; the V54 development branch is modified and unmerged.
- No actual machine benchmark is recorded in this document.
- No GitHub Actions and no deployed visual acceptance performed.

## V54 P1 — Static roadside raster cache

The V50 near-road layer now reuses **fixed-size offscreen sprites** for its static **urban buildings, trees, bank lamps and sound-barrier props**. The cache key includes family, surface, orientation, sky mood and raster density. An LRU accounting rule caps retained raster entries at **8 MiB** (pixel width × height × 4); the visible road clipping, projection, draw order and physics remain live and unchanged.

The preset selector invalidates all V54 roadside sprites on a quality change. The underlying vectors are used again if an offscreen 2D context is unavailable. Traffic cars and their indicators are **not cached in this step**, since lane changes and blink timing are animated. The landmark sprite cache is likewise out of scope.

Run the focused no-Actions checks locally:

```sh
npm run test:graphics
npm run test:roadside
npm test
npm run test:browser
```

The focused roadside test covers cache hits, visual-variant isolation, backing-size selection, eviction, cache clearing, context restoration and allocation failure. The automated unit test cannot establish actual rendered visual equivalence; verify desktop and mobile gameplay screenshots, near-road clipping and frame-time measurements before merging. Retained offscreen pixels are not a measurement of entire browser or GPU memory.

## V54 P2 — Traffic and landmark cache

Distant traffic uses a capped **8 MiB LRU** cache of static vehicle silhouettes. Variant keys include vehicle class, dimensions, color, left/right apparent face, sky mood, raster density and a coarse scale-dependent ink bucket. Dynamic turn indicators continue to draw live; very small and near-field traffic keeps the V53.1 vector drawing path. Physics, projected screen positions, traffic collision boxes, lane selection and clipping are not changed. Inspect the cutoff boundary and fine outlines in browser screenshots: raster caching can change antialiasing.

Landmark sprites use a separate **16 MiB LRU** cap. Crop alpha bounds are determined with a first/last opaque-pixel row scan (`alpha > 35`), matching the previous rectangle definition. The cap measures *retained LRU sprites*, not the temporary 1200×1800 generation surface or the active-stage plan, which can keep references to evicted entries. `v54CacheStats()` exposes the three LRU caches and extra active-stage landmark bytes.

Manual verification (no Actions):

```sh
npm run test:graphics
npm run test:roadside
npm run test:graphics-cache
npm test
npm run test:browser
# Baseline and optimized runs on the same machine:
PERF_INDEX=/tmp/outrun-v53.1.html PERF_OUTPUT=test-results/v53-before.json npm run test:performance
PERF_OUTPUT=test-results/v54-after.json npm run test:performance
node tools/compare-performance.cjs test-results/v53-before.json test-results/v54-after.json
```

The focused P2 test uses Canvas mocks to check variant isolation, draw-time blinking, near-traffic vector fallback, LRU eviction, failed context fallback, alpha crop bounds and stage-held landmark references. This test does **not** certify actual Chromium rendering, memory stability, visual parity, or any FPS improvement.

## V54 P3 — Manual visual and performance acceptance (no Actions)

This step adds a reproducible **30-scene browser parity test**, covering 15 Taipei routes × sunset/neon, using the same deterministic car state and the original **960×540 STANDARD** pixel backing.

The runner:
- Writes 30 V53.1 PNGs and 30 V54 PNGs, and JSON metrics for changed pixels (absolute RGB delta threshold 16), mean channel difference and exact projected road/traffic geometry comparison.
- Interacts with the real graphics preset menu and verifies LOW (720×405), STANDARD (960×540), HIGH (1200×675), ULTRA (1440×810), storage persistence through reload, and unchanged 960×540 physics coordinate dimensions.
- Checks the graphics settings menu in Chromium emulated 390×844 phone and 844×390 landscape; saves extra quality and menu images.
- Fails if route IDs, road or traffic projection, backing sizes, runtime page errors or any graphics preset assertion fail. **Pixel differences are reported, not silently interpreted as visual approval.**

From the V54 branch working tree with Node 22+ and Playwright dependencies installed:

```sh
# Baseline should be the unmodified V53.1 main HTML.
git show main:index.html > /tmp/outrun-v53.1.html

npm run test:scene-metrics
npm run test:graphics
npm run test:roadside
npm run test:graphics-cache
npm test

# Choose one browser setup:
npm run test:scenes -- /tmp/outrun-v53.1.html index.html
# If relying on the host Chromium, instead:
CHROMIUM_PATH=/usr/bin/chromium npm run test:scenes -- /tmp/outrun-v53.1.html index.html
```

Review `test-results/v54-scenes/summary.json`, paired `before/` and `after/` screenshots, and `quality/` screenshots. Focus on high pixel-difference rows, near-road occlusion, floating objects, missing buildings, traffic facing/indicator rendering, nighttime signage and landmarks. This is headless Chromium output, not a screenshot of the deployed build.

For the separate 20% render CPU improvement goal:

```sh
PERF_INDEX=/tmp/outrun-v53.1.html PERF_OUTPUT=test-results/v53-before.json npm run test:performance
PERF_INDEX=index.html PERF_OUTPUT=test-results/v54-after.json npm run test:performance
node tools/compare-performance.cjs test-results/v53-before.json test-results/v54-after.json > test-results/v54-speedup.json
```

Run both benchmarks sequentially on the same machine with identical browser and sampling parameters. The resulting JSON indicates aggregate improvement and per-scene regressions; RAF cadence in this test is not a real gameplay FPS number. Desktop/mobile hardware FPS, long-session memory stability, UI visual sign-off, and public deployment provenance are **not automatically accepted**.

**Execution status:** the local browser audit tool is committed, but this chat session has not produced actual V53.1 vs V54 Chromium screenshots or benchmark numbers. Do not claim a speedup or fully accepted V54 until those are available.
