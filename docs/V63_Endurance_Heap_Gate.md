# V63 — Continuous Driving, Recycle Lifecycle and Heap Stability Gate

**Branch:** `feature/turbo-reimagined-cleanroom-20261015`  
**Access:** `index.html?trafficAI=v60` in **Cruise only**. No ranked, default, physics or Taipei world changes. No copy of third-party source or protected assets.

## Change

Moved `stepTrafficAI60` out of the game frame's `update(dt)` body to eliminate per-update function closure allocation and make long-running AI lifecycle isolation explicit. The traffic decision rules, follow car, collision checks, road routes and the opt-in switch are unchanged.

## New endurance evidence

1. `node --expose-gc tests/v63-traffic-endurance.cjs`: executes 10,800 deterministic fixed-step game updates (3 traversals of the **15 existing Taipei routes**, 240 steps per route) and intentionally recycles 225 cars. Every recycled vehicle must drop the old decision timer, cooldown, pass reservation and veto reason. Traffic population stays constant within each stage, numerical traffic state stays finite and the engine completes another 2 route traversals for post-GC heap comparison. A deliberately generous 24 MiB JS-heap delta limit detects severe retention, not small V8 allocator noise.
2. `npm run test:browser` (extended `tests/v60-traffic-browser.cjs`): boots real Chromium/WebGL, visits 15 Taipei routes 4 times, exercises **7,200 fixed ticks, 180 forced car recycles and 60 actual 3D render calls**, captures the final scene, and samples JavaScript heap using Chrome DevTools' `HeapProfiler.collectGarbage` plus `Performance.getMetrics`. The first pass warms legitimate route caches; the remaining 3 passes must stay within 32 MiB of the warmed heap. Reports are saved to `test-results/v60-traffic-webgl/manifest.json`.

The browser memory metric is **post-GC JavaScript heap**, not GPU VRAM, native Chromium RSS or real-device system memory. A CI software-WebGL pass is not a real phone FPS / battery / subjective road-feel acceptance.

## Safety invariants

- `main` and production public site are unchanged, and PR #26 remains a draft.
- Original routes, geography, collisions, drift, traffic spawn distributions, scoreboard, three game modes and route transitions are untouched.
- Synthetic recycling is an **adversarial accelerated fixture**, not a claim the player naturally drives 15 routes in a real 2-minute game session.
- Avoid failing default Arcade due to AI-only tests; never enable V63 code without `?trafficAI=v60` plus Cruise.

Review original and V63 CI logs/artifacts before claiming that heap and WebGL gates passed.
