# V60 Traffic AI — opt-in cruise integration

Track: Legacy Stable **isolated preview**. No Unity migration, no mainline merge, no public deployment.  
Branch: `feature/turbo-reimagined-cleanroom-20261015` (based on V59).  
Reference: user's Turbo OutRun Reimagined test binary was inventoried, but **no third-party code or resources are copied**.

## Access

Serve the branch's `index.html` with the complete `assets/` directory:

- Normal / ranked: `index.html` — unchanged traffic algorithm.
- V60 preview: `index.html?trafficAI=v60`, then choose **Cruise / 自由巡航**.
- Optionally combine with V59 handling: `index.html?handling=v59&trafficAI=v60`.

The flag alone in Arcade or Sprint does **nothing** to vehicle AI, collision, score or leaderboard. A missing V60 browser module also disables the preview and falls back to ordinary traffic. Opt-in is read once at startup.

## Integration details

The original `src/traffic/LaneIntent.cjs` is the sole source for lane-change planning. `tools/build-traffic-ai.cjs` generates and checks `assets/traffic-lane-intent.js`; this tiny standalone script exposes `window.TaipeiTrafficAI` for the browser. `tests/canvas-harness.cjs` now loads local external scripts in browser order and refuses remote/path-traversing script entries.

The adapter in `index.html` is enabled **only during Cruise with the query flag and a valid module**. It:

1. Takes a read-only common traffic snapshot for all nearby vehicles only on decision frames (roughly every 0.4 seconds).
2. Builds native road corridor samples for current position and 12 segments ahead.
3. Excludes decisions by occupied side/rear lanes, nearby player, split roads, narrow roads or the fork-warning boundary; preserves traffic spawn and visibility filters.
4. Changes only `laneTarget` for a safe pass, then smoothly interpolates `x`; existing `speed`, road shape, player physics, 3D rendering, real collision/close-pass checks and score reward logic are not modified.
5. Resets per-vehicle AI cooldown/decision state when that vehicle is recycled.

The original sine-based lane motion is retained *verbatim* in the default/ranked branch. Static effects, new car brands, new road links, real-map assumptions and new penalty systems are not introduced.

The preview adds `:AI60` to **solo best-time record keys** so these times cannot overwrite ordinary or V59 times. Global lifetime driver-stat increments are skipped for AI preview results. Main arcade leaderboard keys and competition version remain unchanged.

## Verification

Included regression gates:

- `npm run test:traffic-preview` — generated asset parity, the pure decision model and actual inline-game state-machine tests.
- `npm test` — now includes the same checks at the end of the existing V59 suite.
- `tests/v60-traffic-preview.cjs`: compares 90 fixed simulation frames with and without the query flag in Arcade, confirms default record key identity, AI separation in Cruise, real lane-target change and interpolation, player-proximity hold, no speed alteration, and missing-bundle fallback.

**Evidence executed during implementation:**
- Parsed / compiled the current 444 KB inline JavaScript runtime in V8: passed.
- Compared browser asset exactly with source-generated content, evaluated browser module: passed.
- Ran V60 pure planner assertions in a V8 evaluator: passed.
- Executed the V60 integration test against the **real inline game logic** with a stub 2D canvas / simulated DOM: passed **after** the final snapshot-allocation optimization (90 default/ranked comparison frames plus opt-in, cooldown, proximity, fallback and record tests).

**Not completed / not claimed:** Full local Node `npm test` (the local Node/container runtime was unavailable), Chromium/Playwright, Unity compilation, real GPU traffic rendering, mobile FPS, deployment provenance and human-driving feel. No assertion of a production-ready AI driver is made until those gates pass.

## Preservation rules

All V59 Taipei route geometry, 15 routes, 27 landmarks, controls, countersteer profile, nitro, original crash choreography, visible-only collision, collision penalties, highway eligibility, checkpoint/fork navigation, rankings and gameplay clocks must remain untouched. Do not merge the preview into `main` or ship it as default AI without a dedicated in-browser acceptance pass and explicit user approval.
