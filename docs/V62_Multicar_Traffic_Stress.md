# V62 multi-vehicle safety stress — clean-room opt-in traffic

Branch: `feature/turbo-reimagined-cleanroom-20261015`. Opt-in only: `?trafficAI=v60` + Cruise. `main` and ranked modes remain untouched.

**Defect 1, simultaneous merges:** cars on opposite sides of a central lane could both select the center in one update. The snapshot now includes each car's pending active lane change, and reservations are propagated in stable existing traffic-array order after a decision. The second decision sees the first vehicle's reserved lateral sweep, not only its current position.

**Defect 2, high relative velocity:** fixed forward/rear look distances previously skipped fast closing vehicles beyond their base ranges. Safety prediction now widens the relevant horizon according to relative closing speed; otherwise distant peers are still ignored.

**Tests:** New `tests/v62-multicar-pressure.cjs` with 3,600 seeded dense scenes, moving sweeps, extreme relative-speed cases; game-state test exercises opposing lanes, deterministic 90-frame replay and reset on vehicle recycling; Chromium/WebGL test adds a four-car capture. `assets/traffic-lane-intent.js` regenerated from the MIT/clean-room-authorized original source; no third-party game code or art included.

No braking, collision suppression, teleportation, road geometry changes or gameplay RNG changes. Lane reservations prevent simultaneous *planning*, not every possible collision. Headless CI/WebGL approval and real device FPS are different gates.
