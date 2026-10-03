# V43 Verification — Geometry & Drift Hardening

V43 extends the V42 regression suite instead of replacing it.

## Geometry rules

- Coastal stages classify the negative side as `water` and the positive side as `land`.
- Generic coastal water-side scenery uses water-safe props (boats / buoys), not shophouses, pines or rock walls.
- Landmark placement keeps non-bridge landmarks on dry land and allows named bridges on the water side.
- Expressway below-deck districts require at least 520 world-units of deck clearance, so low ramp sections cannot grow buildings through the roadway.
- Rendering still uses shared road corridors for road surface, clipping, barriers and placement.

## Driving rules

- Stored drift nitro remains capped at two units.
- N consumes one stored unit for a 2.8 second boost.
- Boost drift can continue charging at the reduced V42 rate.
- A clean drift recovery now grants a short 0.56 second exit pulse with exhaust feedback; it does not consume stored nitro.
- Swept traffic collision, reverse collision, road containment, pause/input reset and route-transition checks remain enabled.

## Automated coverage

`npm test` executes **829** state / geometry / flow checks across all 15 routes, arcade + sprint geometry, both sky moods, 16 complete arcade branch paths, nitro, drift, collisions, timers and cruise looping.

`npm run test:browser` additionally runs the same scenarios in Chromium, captures representative coastal / expressway / mountain / urban routes, and exercises desktop, phone portrait and phone landscape UI flows while collecting JavaScript runtime errors.

The pull request CI is the authoritative pass/fail result for this branch.
