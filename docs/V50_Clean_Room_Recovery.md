# V50 Clean-Room Recovery

## Why V50 exists

V49 increased visual density and motion too aggressively. Real-play feedback identified three regressions:

1. roadside building art could look oversized or intrude visually toward the road;
2. drift and nitro felt ineffective in real input use;
3. camera motion and shake were strong enough to increase 3D discomfort.

V50 fixes those regressions first, then continues Clean-Room art refinement.

## Clean-Room boundary

The external reference remains black-box only.

V50 does not import or reconstruct:

- source code or control flow;
- disassembly, symbols or opcode mappings;
- ROM / disc / archive / split archive data;
- sprites, textures, tiles, palettes, fonts, music or sound dumps;
- vehicle models;
- handling tables or camera tables;
- distinctive route UI, branded modes, licensed vehicle identity or signature mechanics.

All V50 constants and code are independently authored for Taipei Sunset Drive.

## Drift recovery

The prior helper path temporarily behaved like a full brake because `helperPulse` shared the normal braking branch.

V50 changes that behavior:

- SHIFT / drift helper opens drift entry but no longer executes full braking force;
- helper entry uses only a small speed scrub;
- drift entry speed is reduced to 58 km/h;
- entry ramp is shortened;
- yaw and slip remain clearly visible;
- counter-steer and neutral recovery remain bounded and controllable.

This restores drift as a deliberate steering mechanic instead of a hidden braking penalty.

## Nitro recovery

V49 could feel inactive for two reasons:

- drift charge required a narrow continuous slip/throttle condition;
- N activation required throttle to already be held on the same input frame.

V50 changes this:

- drift charge base rises from 32 to 50;
- valid slip threshold is reduced;
- coasting drift can charge at lower efficiency;
- N can activate a stored boost without simultaneous throttle input;
- successful nitro activation immediately adds a small speed impulse;
- the normal 2.8-second boost then continues through `nitroLatch`.

Nitro capacity and top-speed rules remain unchanged.

## Comfort camera

V50 reduces motion while preserving speed readability:

- camera lean is cut roughly in half;
- curve lean is reduced;
- speed crop / FOV is reduced;
- lateral look is capped at 4.5 px;
- global shake is capped and scaled to 46%;
- off-road player bounce is reduced;
- boost feedback relies more on road-edge lighting and exhaust than camera shake.

## Roadside art repair

The V49 near-camera occlusion layer could place very large screen-space masses too close to the road.

V50 replaces it with `drawV50SafeRoadsideDepth()`:

- uses `districtSurface()` before drawing;
- water-side positions draw rail / vegetation rather than buildings;
- road-adjacent art is clipped using `clipNearRoad()`;
- near scale is capped at 1.10;
- object anchors move farther outside the road envelope;
- all objects remain render-only and never become colliders.

The stable Taipei atmosphere and road-light layers remain.

## Validation

V50 merge requires:

- Clean-Room compliance pass;
- zero ROM binary assets;
- zero forbidden external runtime marks;
- 15 Taipei route identities;
- 16 branch paths;
- Twin Link checks;
- direct regression proving drift helper no longer behaves as full brake;
- regression proving active drift visibly charges nitro;
- regression proving stored nitro activates directly and adds speed;
- real browser keyboard input proving SHIFT + steer enters drift and charges nitro;
- real browser N input proving boost activates without simultaneous W;
- visible `V50.0` build label on desktop, portrait and landscape.
