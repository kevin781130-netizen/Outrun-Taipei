# V64 — Opt-in device performance recorder (read-only)

Use the original experiment branch and append **`?perf=v64`** to the game URL, then select **Cruise / 自由巡航**. To combine with AI: `?trafficAI=v60&perf=v64`. The small bottom-right HUD displays estimated RAF FPS, P95 frame interval and retained hitch count. Click **匯出 JSON** to save `taipei-v64-diagnostics.json`; click **重設數據** to restart sampling. No server endpoint, automatic upload, login details, URL, player input, full user-agent string, account identifier or cloud analytics are included.

## Engineering guarantees

- **Hard opt-in**: the monitor isn't instantiated without `perf=v64` plus Cruise, and it stops immediately if the player selects a competitive mode. It doesn't alter physics, timer, road, scoring, RNG, collisions or leaderboard.
- **Bounded space**: 360 frames and the most recent 24 hitch events retained. Current interval, JS update time, WebGL CPU-submit time and fixed simulation steps are separated; frame gaps above 50ms are logged. Browser-reported JS heap is optional (unsupported browsers show null).
- **Pause/background handling**: suspended timestamps reset the clock so background tab throttling does not create misleading frame gaps.
- **JSON schema:** `taipei.v64.frame-diagnostics.1`. P95 uses the nearest-rank percentile; FPS reflects sampled requestAnimationFrame spacing, **not native GPU timings** or hardware-vsync guarantees. Does not capture graphics memory, native RSS, battery or true sustained phone thermal state.
- **Reproducibility**: record route and quality, start a run, then export JSON immediately after the problem. Do not compare different CI machines to claim a performance gain.

## CI gates

- `tests/v64-frame-probe.cjs`: deterministic fixed-size rings, FPS/P95, jank retention, pause gaps, reset, no identifying metadata.
- `tests/v60-traffic-browser.cjs`: real Playwright Chromium validates disabled Arcade and unflagged paths, visible HUD only in opt-in Cruise, reset and file download, removal after Arcade switch.
- `tools/build-perf-diagnostics.cjs --check`: byte-for-byte browser/CommonJS parity.

**Safety and ownership:** no third-party code transplanted. Only the isolated V60 integration branch is edited; `main` and public deployment are not touched.
