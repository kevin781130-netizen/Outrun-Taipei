# V52 Arcade Taipei Evolution

TAIPEI IS THE GAME. ARCADE IS THE PRESENTATION LANGUAGE.

V52 is unreleased work on branch `claude/modest-davinci-xvkhwl`. Phase 1 added crash flow, approach boards and checkpoint feedback. Phase 2 (this document) measured the game first and then changed only what the measurements justified.

## 0. Evidence statement (clean-room honesty)

`orunners.zip` holds raw ROM chip images only. The environment has no emulator, no capture and no video, so **nothing about the reference title was observed running**. It was unpacked outside the repository, then deleted.

| Tag | Meaning in this document |
|---|---|
| MEASURED | produced by a probe in `tests/tools/` against this game's own code or pixels |
| OBSERVED | seen in a Taipei Sunset Drive screenshot taken in this session |
| INFERRED | genre-level design principle of 1990s large-cabinet highway racers; a hypothesis, not a reference measurement |
| NOT VERIFIED | would need a playable reference capture |

No ROM, sprite, palette, font, audio, handling table or code from the reference is in the repository. `tests/clean-room-compliance.cjs` is unchanged except for the visible build label.

## 1. Measurement tools (new, dev-only)

- `tests/tools/gameplay-probes.cjs corner|speed|traffic|all` drives the real `update()` loop with a scripted driver.
- `tests/tools/qa-shots.cjs <dir>` captures a fixed set of states (4 archetypes, 15 routes, shallow/tight drift, traffic, start countdown, checkpoint, finish, 5 speeds, portrait, landscape). `QA_INDEX=<older index.html>` lets the same states be captured from an older build for before/after.
- `tests/tools/probe-code.cjs` holds the in-page probe code shared with `tests/scenarios.cjs`, so the regression suite re-runs the same measurements.

Limits: the drivers are bots. They are crude (bang-bang steering, a duty-cycled drift line), so numbers show direction and size of effects, not human lap times.

## 2. Gameplay audit

### 2.1 Corner differentiation (MEASURED)

Setup: constant bend on 150 segments of route 1A, entry at 120/180/240/280 km/h, five policies: `coast` (gas only, no steering), `grip` (steer to hold the centre line), `lift`, `brake` (pre-brake), `drift` (lift, Shift pulse, steer in with a held line). Classes: shallow 0.3, medium 0.9, tight 2.2, hairpin 3.6 (route data: 1A/2A have no tight bends, 4D/5D/5E are mostly tight).

Before (Phase 1 rules), entering at 280 km/h, seconds to clear the section:

| Class | coast max offset | grip | lift | brake | drift | verdict |
|---|---|---|---|---|---|---|
| shallow | 0.06 | 8.42 | 8.60 | 9.47 | fails (off road 2.4 s) | grip |
| medium | 0.16 | 8.65 | 8.85 | 9.47 | fails (8.4 s) | grip |
| tight | 0.38 | 9.08 | 9.28 | 9.78 | fails (10.3 s) | grip |
| hairpin | 0.58 | 9.63 | 9.85 | 10.40 | 9.45 (+103 charge) | drift barely ahead |

Findings:
1. Not a single bend, even a hairpin at 280 km/h, forced steering: an unsteered car stayed on the road everywhere. Steering input was almost free (duty 0.01 to 0.10).
2. The speed price of a bend was small (hairpin only +1.2 s over shallow), so lifting or braking before it never paid.
3. Drift worked only on hairpins and was a trap elsewhere. So bend classes did differ visually, but "which technique" had one answer almost everywhere: grip.

Change (small, reversible, constants in `V52_CORNER`):
- One shared `v52SafeCornerSpeed(curve)`. Physics and the HUD "recommended entry speed" now read the same function (the HUD used a second, different formula before).
- Over-speed understeer push (`v52OverspeedPush`) acts on grip driving only. It is zero at or below the safe speed, grows with excess speed and bend demand, and never acts while drifting.
- Grip over-speed scrub raised from 0.27 to 0.45 per second per km/h of excess. Drift scrub is unchanged.

After, 280 km/h:

| Class | coast max offset | grip | lift | brake | drift |
|---|---|---|---|---|---|
| shallow | 0.07 | 8.42 | 8.60 | 9.47 | fails (2.4 s off) |
| medium | 0.19 | 8.78 | 8.93 | 9.48 | fails (8.3 s off) |
| tight | 0.53 | 9.37 | 9.53 | 9.92 | **9.28 (+97 charge)** |
| hairpin | **0.97** | 10.15 | 10.32 | 10.73 | **9.70 (+103 charge)** |

Answer to "do the three bend classes need different strategies?":
- Shallow: yes, grip with minimal steering (duty 0.01). Drift is a mistake.
- Medium: grip is right, drift is risky. Mild speed cost for over-speed entry.
- Tight/hairpin: unsteered cars now reach the edge (0.97 of the road) and grip pays 1.7 s over a shallow bend. Drift is now the fastest line (0.09 s ahead in tight, 0.45 s in a hairpin) and charges nitro. Lifting is slightly worse than just gripping; pre-braking is worst.

Honest remainder: pure pre-braking is still not competitive in the bot runs. Brake keeps its role as a drift-entry input and as traffic management, but it is not a speed-control tool that beats grip. See section 12.

Cost: hairpin-heavy routes get slower for players who only grip (up to roughly 0.5 s per hairpin section); drift players gain. Included in the competitive version bump (section 11).

### 2.2 Straight-section decisions (MEASURED)

Routes 1A, 2B, 4D, 5D, 45 s of flat-out driving, bot policies `hold` (stay in lane) and `dodge` (lane change away from the car ahead):

| | hold | dodge |
|---|---|---|
| crashes per 45 s | 1 to 3 | 0 to 1 |
| cars passed per 45 s | 0 to 5 | 4 to 6 |
| slipstream seconds | 1 to 7 | 0 to 1 |
| close passes (new rule) | 0 | 2 to 4 |

Findings: traffic appears roughly every 8 to 10 seconds and is a real obstacle (holding a lane costs crashes), so straights do contain a lane decision. Slipstream is only +7 km/h per second and Z/A gear and nitro choices rarely matter on a straight. What was missing was a reason to pass close instead of wide. The Close Pass rule (section 4) supplies that. Density, speeds and spawn rules were left alone because they are competitive-difficulty levers and the numbers above are healthy.

### 2.3 Other gameplay items

KEEP EXISTING: steering authority curve, drift entry and recovery, nitro push and drift charging, LOW/HIGH gearing, crash model. No measurement showed a defect, and they interact with the changed corner rule only through the grip path.

## 3. Speed perception (MEASURED, from pixels)

Probe: route 4D, advance the camera one 1/60 s frame, mean absolute RGB difference between the two frames. Overlays (speed lines, comfort rush) can be disabled to isolate world flow.

| Speed | whole frame | road area | periphery | world flow only | overlay share |
|---|---|---|---|---|---|
| 100 | 2.40 | 0.90 | 7.57 | 2.40 | 0% |
| 160 | 3.21 | 1.18 | 9.08 | 3.21 | 0% |
| 220 | 3.79 | 1.40 | 11.07 | 3.79 | 0% |
| 280 | 4.43 | 1.86 | 12.47 | 4.38 | about 1% |
| 325 (nitro) | 5.18 | 2.58 | 14.40 | 4.80 | about 7% |

Findings:
1. The sensation already comes from world flow, not from speed lines (they add about 1% at 280). The answer to "is speed mostly lines?" is no. Speed lines were left alone.
2. Picture change is compressed against real speed: 160 to 280 km/h is 1.75x faster but only 1.38x more picture motion. Zoom crop is 1 to 2 px, so there is almost no camera component (good for comfort).
3. The engine note barely separates speeds. Computed from the audio formulas, carrier frequency was about 159 Hz at 160 km/h, about 143 Hz at 220 km/h after the AT upshift, and about 163 Hz at 280 km/h. By ear 160 and 280 differ by about 3%.

Change: a speed-driven road-wind layer (`v52WindProfile`), silent at rest (gain 0.0001 at 0 km/h, still the floor at 20 km/h, fading in between 30 and 90 km/h), band-passed noise whose gain rises about 2.7x and whose centre frequency about 1.6x between 160 and 280 km/h, independent of gear. No camera motion and no new lines were added. Regression asserts both the pixel-flow ordering and the wind curve.

## 4. Traffic: Taipei Close Pass (replaces the old near-miss)

Problem: the existing `nearMiss` fired at any speed, gave no feedback beyond a toast, shook the camera (`screenShake 3.5`, above the V50 comfort budget), blew the horn, and bumped the drift combo.

New rule (original, constants in `V52_CLOSEPASS`). A Close Pass has two stages:
- **Candidate (`armClosePass`)**: player at least 150 km/h and closing at least 45 km/h, D gear forward, car visible, lateral gap 0.012 to 0.09 road units (under 0.045 is tight), car within 1.5x its contact depth of the player, no collision or cooldown state. This only records the minimum gap, side and screen position on the car. **No score, no total, no chain, no feedback.**
- **Completed (`awardClosePass`)**: when the candidate car's `dz` falls below minus its contact depth (`trafficContactDepth(car)` = the same longitudinal half-length `trafficContact` uses, 210 + 2x sprite height), i.e. it is geometrically behind the whole contact box, and speed is still at least 150 km/h. Only then: 120 points (240 if tight), `closePassTotal`, chain (3 s window, up to +75%), label and whoosh. One award per car.
- Any crash (traffic or barrier) clears every candidate, the chain and the labels, so a candidate that ends in a collision pays nothing. A pass completed earlier keeps its points. Candidates also expire after 4 s, or if the player leaves D gear or reverses.
- The earlier version (Phase 2 first commit) paid at the moment of arming, so a pass that ended in a collision one frame later still kept its score. `nearMiss()` was renamed `awardClosePass()` to match.
- Feedback: a small Chinese label near the car ("擦身而過 +120", "極限擦身 +240"), fading in 0.8 s, and a soft band-passed whoosh panned to the car. **No camera shake, no drift-combo coupling, no nitro reward.**
- Considered and rejected: nitro or drift-charge reward (farmable charge source), auto-magnetism, long combo UI.

Scoring change goes under the new competitive namespace (section 11).

### 4.1 Audio routing

Music and gameplay SFX are separated. `fmNote()` (music scheduler) is the only path gated by the radio switch; it delegates to `sfxTone()`. Countdown, GO voice, checkpoint chime and voice, approach tick and close-pass whoosh call the SFX path directly and play with the radio off. Multi-note cues are scheduled on the audio clock (`delay`), not with timers. Existing direct-oscillator SFX (shift, horn, coin, screech, nitro) were never radio-gated.

## 5. Visual depth audit (OBSERVED, screenshots)

- Background and mid layers: every route already has a distinct sky palette and skyline. The urban routes (1A, 3C, 4D, 5D) share a mid-rise skyline silhouette; mountain routes share ridge shapes. KEEP.
- Roadside: building and landmark placement is surface-aware and clipped. No clipping, giant foreground or building-on-water case was found in the 15-route captures. KEEP.
- Weakest layer: the **road-edge furniture**. Cadence was world-anchored but the object was chosen per family only (4 designs for 15 routes: every coastal route, every mountain route and every urban route showed the same post). That is the layer that was changed (section 6).
- Player and traffic grounding: shadows are present, vehicles sit on the road in all captures. KEEP.
- Close-pass label sits over the passed car and fades; it did not hide the road in the captured frame.

## 6. 15-route visual vocabulary

Features compared per route pair: archetype, scene type, prop family, lanes, width, road-edge furniture, water, hill bucket, tight-bend share, sky, traffic bucket.

| Route | Archetype | Lanes/width | Sky/ground | Road-edge furniture (V52) | Distinct vocabulary |
|---|---|---|---|---|---|
| 1A | urban | 3 / 1.00 | blue, stone | civic twin lamp + street tree (baseline kept) | civic boulevard |
| 2A | mountain | 3 / 1.00 | teal, forest | white-banded avenue trunk | Yuanshan tree-lined |
| 2B | expressway | 3 / 1.00 | blue, slate | expressway arm lamp | elevated deck |
| 3A | coastal | 3 / 1.00 | green-teal | white railing with steam | hot-spring waterfront |
| 3B | mountain | 3 / 1.00 | violet dusk | slim riverside lamp | Dazhi: buildings left, pines right (new `dazhi` props) |
| 3C | urban | 3 / 1.00 | grey-blue | low globe lamp + planter | cultural park |
| 4A | coastal | 3 / 1.00 | orange sunset | flood wall with gold lamp | Tamsui promenade |
| 4B | mountain | 2 / 0.80 | green-blue | **black-yellow chevron board that points along the bend** | Yangmingshan road |
| 4C | expressway | 3 / 1.00 | indigo dusk | amber double-arm lamp | Neihu night corridor |
| 4D | urban | 2 / 0.82 | blue-violet | tall amber lamp + bus stop sign | Xinyi back streets |
| 5A | coastal | 3 / 1.00 | pink sunset | white mast with pennant (new sparser `marina` props: low shophouse and lamps alternate) | wharf |
| 5B | coastal | 2 / 0.70 | sea blue | black-white hazard bollard + low wall | north-coast cape |
| 5C | mountain | 2 / 0.66 | dusk brown | timber post with red lantern | Jiufen |
| 5D | urban | 2 / 0.74 | deep blue | LED light column (new `skyline` props: towers only) | Xinyi finale |
| 5E | mountain | 2 / 0.66 | purple-green | tea-garden route marker + tea hedge | Maokong |

Before: the closest pairs differed in only 3 features (2A/3B, then four pairs at 4: 3A/4A, 3A/5A, 4A/5A, 4D/5D). After: every pair differs in at least 4 (regression `V52 route vocabulary`). No landmark was added or removed; the 4B chevron is also a functional curve-direction cue that Taiwanese mountain roads actually use.

## 7. Start and finish presentation

### Start (OBSERVED before: stage card appeared only at GO and centred, colliding with the digits; nothing identified the route during the countdown)
- The route card ("STAGE n / 5 · id", route name, "READY · 準備出發") now shows at the top during 3-2-1 and flips to "ROUTE START" at GO. The countdown digits stay clear.
- Engine revs once per count (rpm rises over each second), then the existing GO tone. About 3 seconds total, no new cinematic, nothing blocks input after GO.

### Finish
- Cleared: the existing goal celebration stays and gains one glanceable row: time left, score, route chain, close passes and collisions.
- Failed: a 1.8 s "TIME UP · 時間到" card with the route where the run stopped and the same row, then the leaderboard (was 0.8 s straight to initials).
- Small screens: card sizes reduced for portrait and short landscape so nothing is cut off.

### Checkpoint
- Chime, gold flash, bilingual title. **Camera shake removed** (it had been added in Phase 1 against the stated approach).

## 8. UI and rules consistency

- Stale player-visible V51 text removed from the menu title, eyebrow, canvas label and the default overlay, version label now V52.0. Historical `v51*` function and constant names are intentionally untouched. The atlas note says "V51 起" (history).
- Menu, fairness card, draft HUD, status bar and garage stats used numbers that disagreed with the game (280/300 km/h, 4.00 s nitro). They are now filled from `COMPETITION`, `GEAR_RULES`, `NITRO_RULES` by `applyRuleLabels()`; no second copy in HTML. Real values: LOW 185, normal 285, nitro 325 km/h, 2.8 s per nitro, 2 stored.
- Guard: `tests/ui-consistency.cjs` (part of `npm test`) rejects hard-coded rule numbers, unknown `data-rule` keys, visible V51 text, and any `screenShake` in `awardCheckpoint` or `nearMiss`. It was checked against the Phase 1 file and fails there as intended. Browser smoke also compares rendered text against the constants.

## 9. Before / After findings (screenshots)

Same state, route, `playerZ` and viewport, captured with `qa-shots.cjs` from the Phase 1 commit and from the working tree.

- 15 routes: layouts, skylines, clipping and HUD unchanged; differences are small road-edge objects (4B chevrons, 3A rails, 5B bollards, 5E markers readable at full size, subtle in thumbnails). No clutter increase.
- Start: card moved clear of the digits; route name now visible during the countdown.
- Finish: summary row fits desktop, portrait and landscape after the CSS fix. First landscape capture cut off the title; fixed and re-captured.
- Close pass: label legible, no overlap with HUD. A first version drew a light streak across the passed car; removed.
- Shallow and tight drift frames: unchanged by design (visual yaw model untouched).
- Speed series 100 to 325: unchanged picture, which matches the intent (wind audio only).

## 10. KEEP / ADAPT / REJECT

| Item | Decision | Reason |
|---|---|---|
| Physics/presentation yaw split, curve-bound drift, drift + nitro together | KEEP | Measured to be sound |
| Steering curve, nitro push, crash model | KEEP | No defect measured |
| Speed lines, comfort rush, camera zoom | KEEP | World flow already dominates (about 1% overlay) |
| Safe-speed rule shared by physics and HUD | ADAPT | Principle: tell the player the real limit; one source of truth |
| Over-speed understeer + grip scrub | ADAPT | Make bend class matter without auto-assist |
| Close-pass reward without shake or combo | ADAPT | Risk/reward for passing close; Taipei label and original whoosh |
| Speed-driven wind audio | ADAPT | Audio had almost no speed separation |
| Countdown identification and rev | ADAPT | Short, skippable-in-effect start cadence |
| Result summary row | ADAPT | Hierarchy and clarity |
| Route-specific road furniture | ADAPT | Taiwan roadside vocabulary, no new landmarks |
| Camera shake for checkpoint or close pass | REJECT | Comfort; V50 budget |
| Nitro or charge reward for close passes | REJECT | Farmable, unbalances drift economy |
| More landmarks per route | REJECT | Theme-park risk; punctuation not content |
| More speed lines or neon layers | REJECT | Measured as unnecessary; noise |
| Reference-style HUD, results layout, music | REJECT | Originality and clean-room |
| Raising traffic density | REJECT | Measured as already forcing choices |
| Pre-brake-as-speed-tool rebalance | DEFERRED | Needs human playtests, bots are too crude |

## 11. Versioning

`COMPETITION.version` stays `52.0`. V52 has not shipped, so Phase 1 and Phase 2 rule changes (crash timing, corner rules, close-pass scoring) share one competitive namespace and old V51 records are never mixed with them. If this branch is released and rules change again, bump to `52.1` or `53.0`. Build label: V52.0.

## 12. Remaining weaknesses

1. Brake as a speed tool is still not competitive in bot runs; its main value is drift entry.
2. All numbers come from scripted bots; human playtests are needed, especially for the new hairpin cost on routes 4D, 5B to 5E.
3. Drift on shallow and medium bends is punished mostly through sustained steering; there is no explicit teaching cue.
4. Road-edge furniture is small at thumbnail scale; skyline silhouettes of urban routes are still similar.
5. Compact landscape: the start card overlaps the scene-identity chip. Acceptable but crowded.
6. Reference comparison remains NOT VERIFIED until a playable capture exists.
