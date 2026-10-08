# V54 — Manual Performance Baseline (No GitHub Actions)

This task is deliberately **manual-only**. Do not start, depend on, or wait for GitHub Actions. The V53.1 browser game stays unchanged on main and on this branch until a separate reviewed optimization is implemented.

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

Until optimized V54 rendering code is committed, **there is no meaningful before/after improvement to claim**: both files may be identical. Verify sourceSHA256 in each report.

## Measured

- **30 fixed scenes:** 15 Taipei routes × sunset/neon, segment 200, speed 220.
- **CPU render:** warmup 20, default 60 timed draws per scene, mean and P95.
- **RAF frame pacing:** real browser animation callbacks with render; *no update loop*, so not full gameplay FPS.
- **Memory:** 3 full scene cycles with GC and Chromium JS heap used; does not capture GPU memory or total RSS.

The comparison rejects mismatched browser versions, viewports, samples or scene states and reports both per-scene regressions and aggregate render improvement. The V54 target is **at least 20% aggregate render-time improvement**, with no severe route regressions. Do not claim phone 30 FPS, desktop gameplay 60 FPS, no leaks, visual correctness or production acceptance from these headless measurements.

## Status

- Baseline tools added to a separate branch.
- Existing 53.1 game and main are not changed.
- No actual machine benchmark is recorded in this document.
- No GitHub Actions and no deployed visual acceptance performed.
