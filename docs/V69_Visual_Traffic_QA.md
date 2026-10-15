# V69 — Real WebGL Traffic Animation and Taipei Terrain Visual QA

## Goals / boundaries
No production gameplay, physics, scoring, AI planner, model or artwork change. This gate is **only visual and geometric testing** on the independent V60/V68 Cruise opt-in. The default/ranked game, 15 route identities and original geography are untouched.

## Browser coverage
`tests/v69-traffic-visual-browser.cjs` loads real pinned Three.js in Chromium/SwiftShader and captures 26 PNGs (14 urban, 8 terrain, 4 abort) with SHA-256 hashes and a JSON manifest. No eval endpoint is shipped: test instrumentation is injected only into the ephemeral local HTTP response.

- Urban Taipei route **1A**, desktop 1280×800 and phone portrait 390×844: 181 fixed updates per viewport; seven scene snapshots each (start, initial choice, early turn, midchange, approach, settle, after-settle). Check continuous lateral movement, no instantaneous jump, road eligibility, turn yaw sign and ±0.16 rad cap, successful completion and changing screen pixels.
- Taipei **4B mountain** and **5B coastal**: four captures per route, route identity, real terrain/coast archetype, finite animation coordinates and absence of unsupported elevated roadway decks.
- Late arriving destination-lane intruder: four captures, 30 updates, no lateral snap, safety veto, no undeserved completion or collision.
- Every screenshot is an actual WebGL canvas capture, not Canvas2D compositing. Screenshots and manifest uploaded to the existing `game-browser-qa` CI artifact.

## Interpretation
Pass establishes deterministically testable invariants only. PNG hashes show the rendered picture is changing, **not** that the images are aesthetically perfect. Human visual review is still needed. CI uses headless Chromium's software GPU and is not evidence of real-device FPS. This change does not authorize PR merge or public deployment.
