# V53 Taipei Art Direction + Speed Curve Pass

TAIPEI IS THE GAME. ARCADE IS THE PRESENTATION LANGUAGE. MAKE SPEED FEEL EARNED.

Base: V52.0 on `main`. Branch: `claude/v53-art-speed-pass`. Competitive namespace: **53.0** (acceleration, caps, nitro, gearing, time budgets changed).

## 0. Evidence

- MEASURED: produced by `tests/tools/gameplay-probes.cjs` against the game's own physics, or by `tests/tools/qa-shots.cjs` screenshots. Bots are scripted drivers; numbers show direction and size, not human lap times.
- OBSERVED: seen in screenshots captured in this session (same state, route, `playerZ`, viewport, V52 build vs V53 build via `QA_INDEX`).
- No reference ROM data, sprite, palette or audio is used. All art is original Canvas code.

## PART B: SPEED CURVE

### B1. Problem (MEASURED on V52)

Flat road, no traffic, throttle only, AT:

| Metric | V52 |
|---|---:|
| 0 to 100 km/h | 0.97 s |
| 100 to 160 | 2.36 s |
| 160 to 200 | 2.85 s |
| 200 to 230 | 3.55 s |
| 230 to 250 | 3.37 s |
| time to 95% of normal max (271) | about 18.5 s |
| normal max | 285 (hard clamp, held for ever) |
| nitro: 230 to 320 | 0.37 s (peak 325) |
| bot, whole route, % of time at or above 98% of cap | 15.8 / 0 / 10.2 / 10.9 / 12.5 / 10.4 (1A, 2A, 2B, 3A, 4A, 5A) |

Cause: a hard `clamp` at the gear maximum plus a thrust curve that stayed strong until the wall. 0 to 100 in about one second and a cap reached in 22 s meant the top of the speed range was a default state; acceleration, gearing, draft, nitro and exit speed barely mattered.

### B2. New model (independent)

Thrust follows `K * (1 - v/Vmax)^q`, so speed **approaches** Vmax and never hits a wall. Constants live in `V53_SPEED`.

- HIGH: `K 35.5, q 1.38, Vmax 270`, middle-range sluggishness multiplier 0.70 rising to 1.0 by 180 km/h. LOW: `K 57.6, q 1.44, Vmax 185` (harder launch, bottleneck at 185).
- AT shifts up at 145 and down at 105. The manual sweet window is 105 to 150 (best manual shift is near 118).
- Nitro: capped relaxing thrust toward the boost speed (`min(38, 0.55 * (300 - v))`), 10 km/h impulse (was 28), 2.8 s. Above the sustainable speed, a smooth overspeed drag (0.30 per second per km/h) bleeds the excess; there is no hard cut. Overspeed drag is suspended while boosting.
- Slipstream no longer adds a flat +7 km/h per second. It raises the sustainable speed by up to 10 km/h, building at 0.7 per second and fading at 1.2 per second.
- Moment boost 62 to 28 per second, shift punch 22 to 14.
- Caps: normal 270 (asymptote), boost 300 (clamp), LOW 185. UI numbers come from these constants.
- A wall scrape can slow the car but never below 30 km/h (with the weaker low-speed thrust relative to the per-frame scrape, a car pinned to a shoulder could otherwise stop at 0 km/h with no steering authority).
- Route time budgets rebased: bot averages fell about 7 to 12% (V52 223 to 251, V53 213 to 227 km/h), so `V53_BUDGET_SPEED 222` (was 245) and the arcade time options 80/92/104 s (default 92; was 75/85/95). First-checkpoint times (grip bot, from 0 km/h): 1A 31 to 38 s, 2A 40 to 46 s, 3A 55 to 56 s, 3C 62 to 64 s, 4B 78 to 77 s.
- Crash re-entry speed 96 to 118 km/h, because rebuilding speed is now slower.

### B3. Before / After

| Metric | V52 | V53 |
|---|---:|---:|
| 0 to 100 | 0.97 s | 2.98 s |
| 100 to 160 | 2.36 s | 5.25 s |
| 160 to 200 | 2.85 s | 5.34 s |
| 200 to 230 | 3.55 s | 7.91 s |
| 230 to 250 | 3.37 s | 12.45 s |
| Time to 95% of normal max | about 18.5 s (271) | about 43.5 s (257) |
| Normal max | 285 | 270 (asymptote; reached 262 after 60 s, 98% takes about 70 s) |
| Nitro peak (from 230) | 325 | 291 (cap 300) |
| Nitro, 230 to 285 | 0.15 s | 2.1 s |
| % race at or above 98% of cap, grip bot | 0 to 15.8 (mean about 10) | 0 on every route |
| % race at or above 95% of cap, grip bot | 0.2 to 23.4 | 0 to 26 (1A 18, 2A 26, 3A 10, 4A 17, 5A 2) |
| Whole-route bot average speed | 223 to 251 | 213 to 227 |

Extra V53 numbers: 0 to 60 in 1.4 s. 200 to 257 takes 30 s. Nitro from 180 reaches 279, from 250 reaches 296, after a boost 292 falls to 279 within 8 s with no frame dropping more than 1.2 km/h. Manual shift at 118 reaches 160 km/h in 7.6 s, AT in 8.2 s, a late shift at 150 in 9.0 s.

Top speed is now a moment: it needs a long straight, a clean exit, slipstream or nitro.

### B4. Nitro and drift economy (MEASURED, whole route, bot with human-like drift line and nitro on straights)

| Route | grip time | drift+nitro time | nitro uses | seconds boosting | % at 98% cap (drift bot) |
|---|---:|---:|---:|---:|---:|
| 1A | 50.0 | 49.5 | 1 | 2.8 | 7.1 |
| 3A | 67.9 | 71.3 | 4 | 11.3 | 27.6 |
| 4D | 103.8 | 107.7 | 3 | 8.4 | 8.9 |
| 5B | 102.7 | 132.5 | 5 | 14.1 | 10.9 |
| 5E | 145.3 | 151.6 | 4 | 11.3 | 5.1 |

V52 same bot: drift+nitro 29 to 34% of the time at the cap on 1A and 3A, and 5 uses on 5B. Conclusion: nitro is worth more per use now (a push into 285+ that normal driving cannot hold) but is not farmable; drifting does not out-run gripping over a whole route in the bot, so charge remains a reward for risk, not a free speed source. No change to charge rate was needed.

### B5. Corners after the new curve (MEASURED, entry 265 km/h, seconds to clear the section)

| Class | coast max offset | grip | lift | brake | drift (charge) |
|---|---:|---:|---:|---:|---:|
| shallow 0.3 | 0.06 | 9.02 | 9.43 | 10.52 | 9.22 (131) |
| medium 0.9 | 0.17 | 9.20 | 9.43 | 10.52 | 9.25 (93) |
| tight 2.2 | 0.47 | 9.85 | 10.00 | 10.55 | **9.78 (72)** |
| hairpin 3.6 | 0.86 | 10.70 | 10.87 | 11.33 | **10.45 (74)** |

`V52_CORNER` constants were not changed (probes first, no tuning). The corner differentiation still holds: grip is best on gentle bends; drift costs 0.2 s on a shallow bend, 0.05 s on a medium bend, and pays 0.07 s and 0.25 s on tight bends and hairpins while earning nitro; unsteered cars now leave the line only on tight and hairpin bends. Pre-braking is still the slowest option everywhere (unchanged from V52): its role remains drift entry and traffic.

Correction to the V52 document: its claim that drift is "a trap" on gentle bends came from a crude bot. With a bot that steers away from the shoulder the cost is small but real; the regression now asserts the ordering of costs, not a trap.

### B6. Audio and camera

- Road wind is re-mapped to the new range (divides by the boost speed). Gain steps between 80, 140, 180, 220, 250 and boost are each at least 1.2x (first step 1.5x) and 0 km/h stays at the silence floor. Engine pitch, gear shift sweet window, speed-line start (80% of top speed) and comfort-rush start were re-based.
- No camera shake or FOV change was added for speed; V50 comfort limits are untouched.

## PART A: ART DIRECTION

### A1. Visual audit (OBSERVED, V52 screenshots)

| Layer | Finding | Action |
|---|---|---|
| Sky / atmosphere | flat gradients, no humidity; magenta and purple horizons on 5D, 4D, 3B, 5E, 4C, 2B; hard sun | haze pass; magenta/purple removed |
| Far background | silhouettes already present, flat | kept, now seen through haze |
| **Midground** | **empty between far skyline and road edge** (weakest layer) | cached per-route mid layer |
| Road edge | one post type per archetype (V52 fixed that) | utility poles with wires, retaining walls |
| Road surface | clean but flat | near-only wheel tracks, lane sheen, gutter, patches, drains |
| Buildings | already extruded with windows, signs, AC units; lighting flat | sun wash / cool shade, lit shopfronts at night, rim light |
| Player car | single translucent shadow, floating look | penumbra + core + wheel-contact + road sheen |
| Traffic | small sprites, weak edge | dark rim, roof rim light, contact shadow, tail-light halo that grows with distance |
| Landmarks | solid but crisp against haze-free sky | haze blends them into the skyline; 101 gets sun-rim / lit curtain wall |

### A2. Changes

1. **Cached mid-distance layer** (`drawV53Mid`): built once per route and mood into an offscreen canvas and blitted with integer-aligned parallax, so it costs a plain copy per frame. 15 profiles in `V53_MID`: 1A broad low civic blocks; 2B mid-rise with a deck line; 3B Dazhi mid-rise with a ridge behind; 3C very low, wide, sparse blocks (cultural park); 4C regular grid tech blocks; 4D tall dense blocks; 5D crescendo of ever taller towers with aviation lights; 2A, 3A, 4B, 5C, 5E ridge layers with fog between them, and sparse slope houses, rock face (4B), dense terraced houses with lanterns (5C), tea terraces (5E), opposite bank (3A, 4A, 5A) and a headland (5B). Window lighting at night is mostly warm white and cool white, with a few accents.
2. **Taipei basin haze** (`drawV53Haze`): a warm (sunset) or cool (night) glow on the horizon, per-route amount (5E 0.64, 4B 0.56, 5C 0.54, coastal about 0.5, urban about 0.34, elevated 0.30). It sits after the landmark so landmarks blend into the skyline.
3. **Palette retune** (static, no runtime cost): purple and magenta horizons, mountains and sunsets shifted to steel blue and warm amber. A regression asserts no hue between 255 and 346 degrees with saturation above 0.18 in `THEMES`, `V40_ART`, `SCENES` sky data. Kerb colours are unchanged. No pink, no neon skyline, no palm, no highway-sign imitation.
4. **Roadside infrastructure** (`drawV53RoadsideInfra`): Taiwanese utility poles (one side, crossarms, sagging wires between poles, transformer plate) on non-elevated routes, never on water; concrete retaining walls with caps and weep holes in irregular runs on mountain routes (2A, 3B, 4B, 5C, 5E). Both sit outside the road envelope plus 0.34 and behind the V52 road-edge furniture.
5. **Road art** (`v53RoadWear`): wheel tracks, lane-centre sheen, inner gutter line, occasional patches and drain grates, drawn only on the nearest segments.
6. **Building lighting** in `drawV42TaipeiBlock`: warm wash at sunset, dim facade and lit shopfront at night, rim light.
7. **Vehicles**: described in A1.
8. **Landmarks**: Taipei 101 sun rim / night curtain wall; all landmarks gain haze blending. No landmark added or removed, no route given an extra famous landmark.

Route changes: biggest are 2B, 4D, 5D (skyline depth, no more magenta), 3B (Dazhi), 5C, 4B and 5E (mountain depth, walls, fog), 3A, 4A and 5A (opposite bank, haze). Weakest still: 3C (washed out by haze, little vegetation variety), 1A (day mid layer is subtle), water reflections are limited to the haze strip.

### A3. Performance (MEASURED, software-rendered headless Chromium, best of 3 runs, ms per frame)

| Route | V52 | V53 |
|---|---:|---:|
| 1A sunset | 22.6 | 27.4 |
| 2B neon | 25.3 | 29.9 |
| 3A sunset | 18.9 | 26.3 / 23.2 (re-measured after trimming) |
| 4B sunset | 12.0 | 16.5 |
| 4D neon | 13.6 | 16.1 |
| 5C neon | 20.5 | 25.8 |
| 5D neon | 12.3 | 14.3 |

Run-to-run noise in this environment is about 10 to 20%. Interleaved A/B on 3A and 1A shows all V53 art costs about 2 to 3 ms (10 to 15%) in a software rasteriser; GPU canvases cost far less. No per-frame allocations were added (the mid layer canvas is cached and reused; gradients are two per frame); wear, poles and walls are limited to near or visible segments and culled by size.

## Tests

`npm test` and `npm run test:browser`: 1007+ checks (958 in V52). New checks cover: acceleration time ladder (0-60, 0-100, 160, 200, 230, 250, 95%), monotonic acceleration rate, asymptotic maximum, nitro peak and smooth decay, draft behaviour, LOW/HIGH relationship, manual versus AT shift, cap-dwell on two routes, wind range, V53 mid layer per route and mood, finite infrastructure, mountain-only walls, palette hue guard, competitive namespace and re-based timing, plus the existing corner, close-pass, route-furniture and finite-projection checks. The UI consistency test now also rejects stale 285/325 numbers.

## KEEP / ADAPT / REJECT

- KEEP: V52 corner constants, close pass, route furniture, crash model, steering curve, camera comfort limits, V51 drift model, clean-room rules.
- ADAPT: asymptotic speed model, mid layer, haze, retaining walls, poles and wires, road wear, vehicle grounding, building lighting.
- REJECT: tuning `V52_CORNER` in this pass (probes first, no change needed), camera shake or FOV for speed, more landmarks, neon or purple skylines, per-frame shadow blur, new 3D engine, charge-rate change.

## Remaining weaknesses

1. Everything above is bot-based; the speed curve and the longer rebuild after a corner need human playtests, especially routes 4D to 5E.
2. Pure braking is still not a competitive speed tool.
3. Near-road buildings are still expensive to draw; a cached sprite per building variant would cut cost.
4. Water reflection, bridge shadows and sunset sun-streak are not implemented.
5. Day-time 1A and 3C remain the least dramatic routes.
6. Reference comparison remains NOT VERIFIED (no playable capture).
