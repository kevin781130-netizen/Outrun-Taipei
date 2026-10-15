# V61 — In-flight lane safety and deterministic steering (clean room)

**Branch:** `feature/turbo-reimagined-cleanroom-20261015`  
**Release status:** experimental Cruise preview only via `?trafficAI=v60`.  
**Never merge, publish or enable in competitive arcade mode without user approval.**

## Concrete defect corrected

V60 only checked the surrounding traffic at the beginning of a lane change. If a vehicle appeared on the destination lane mid-maneuver, the AI continued crossing. V61 adds a bounded reassessment roughly every 0.16 simulation seconds during an AI-initiated maneuver. When road / player / intruder conditions become unsafe, it stops lateral steering at the current location; no position teleport, speed adjustment, collision suppression or reverse move. It does **not** promise to prevent inevitable longitudinal collisions: the existing visible-only collisions remain authoritative.

The pure `inspectLanePath()` checks road corridors (including split areas), destination vehicle and swept lateral path, speed-dependent rear and front safety gaps, nearby player and the approach to a route fork. Unsafe input fails closed. The ordinary `planLaneIntent()` uses a single closest-leader scan, avoiding a full sort, materialized peer copies and redundant temporary arrays.

The game adapter builds one common filtered peer snapshot when any AI needs a decision: it excludes traffic already invalid under `trafficRoadEligible()` (ghost road cars and expressway scooters). Each vehicle reuses that snapshot without a per-car `filter()` allocation. Lane interpolation is now exponential `1-exp(-1.15*dt)`, giving approximately equal movement under 30/60/120 Hz fixed steps.

## QA gates

- `tests/v61-traffic-safety.cjs`: path intrusions, approaching rear traffic, road/fork/player guard, deterministic immutable snapshot.
- `tests/v60-traffic-preview.cjs`: live game simulated mid-maneuver intrusion, invalid scooter exclusion, 30/60/120 fixed-step consistency, default/ranked unchanged.
- `tests/v60-traffic-browser.cjs`: real Chromium/WebGL intrusion and abort, plus original GPU and route checks.
- `tools/build-traffic-ai.cjs --check`: single source of truth for browser and CommonJS planner.

Do not conflate CI software-WebGL metrics or tests with real device FPS or human screenshot acceptance. No proprietary Turbo OutRun code/assets are transplanted.
