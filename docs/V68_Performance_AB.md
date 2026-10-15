# V68 — Same-environment V67/V68 traffic arbitration A/B test

V68 changes only the V60 Cruise opt-in traffic scheduler, **not** main, ranked, vehicle physics or collision rules.

- Old (V67): considers vehicles during active cooldown, then `peers.find()` for each successful reservation.
- New (V68): excludes candidates with unexpired cooldown before invoking the planner; uses one dense peer ID index for constant-time reservation updates.
- The V67 queue's original implementation is retained in a **test-only** fixture, so the comparison executes the *same full game* under a single pinned Chromium process and CPU backend.
- Benchmark order is **A-B-B-A repeated three times** with the same route, viewport, RNG seed, scenario and 360 fixed-step updates per pass. Both variants are loaded as separate browser pages within that process, alternately.
- Each run records CPU elapsed time (update only), state digests and outcome equality; the QA JSON includes medians and all individual measurements. No benchmark-derived speed threshold is used for CI pass/fail, to avoid host-load flakiness.
- Unit tests guard the control fixture and verify the decision/reservation effects of the optimization in an isolated mock environment.
- Full existing Chromium/WebGL and ranked/default behavior suites remain required and unchanged.

**Interpretation**: differences are indicative of local headless Chromium CPU simulation load, not GPU FPS, mobile device FPS, or real-time in-game wall-clock frame time. Repeating ABBA helps control time drift but does not eliminate host jitter. If results are inconclusive, do not claim a speed-up.
