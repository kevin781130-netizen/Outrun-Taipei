# V67 — Lightweight arbitration for simultaneous traffic lane-change requests

**Scope**: V60 Cruise opt-in only (`?trafficAI=v60`). Neither `main`, ranking, collision physics nor the original Taipei routes are modified.

The previous same-frame reservation process handled vehicles in JavaScript array order, granting a nearby center lane to an early array slot. V67 collects ready, non-maneuvering candidate cars, orders them by bounded denied-request count (descending) and world Z (ascending), then lateral X and speed. Array ID is a deterministic last tie-break only for physically identical inputs. The ordering is pure, has no RNG/dependencies, and only sorts the maximum current traffic count (small, <= existing traffic pool size).

In priority order, each request goes through the exact V60/V61 `planLaneIntent` safety function. A successful request reserves its full target lane-change path in the shared existing peer snapshot, so later candidates must hold or use an available alternative. At actual per-car execution, `inspectLanePath` revalidates the planned destination. Denied cars whose nearby lanes are blocked accumulate capped waiting credits (0..8); a permitted request resets that counter. On traffic respawn, waiting credits are cleared. **Safety always outranks fairness.** Longitudinal speed, collision semantics, actual vehicle positions and ranked/default update paths are unchanged.

Validation: new V67 pure tests, reversed-array simulation and waiting-priority scenario, actual Chromium/WebGL waiting-priority test, original V59 geography/physics/regression, existing V62 same-frame reservation, V63 endurance, V65 adversarial.

This is a local heuristic, not a mathematical starvation-freedom or real-world collision-prevention proof. As with previous stages, screenshot review and real mobile GPU FPS remain unverified. Do not merge the draft PR automatically.
