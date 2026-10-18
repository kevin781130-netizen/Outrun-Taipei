# V82 — Reduce excessive inward drift trajectory

V81 corrected the rendered nose/front-wheel direction. Player feedback confirmed
that direction but found the actual trajectory too aggressive toward the apex.

## Change

Keep V81 rendering and existing body yaw/slip targets. In `stepArcadeMotion`,
reduce only turn contributions pointing toward `driftDirection` to 68% at steady
state. This covers the travel-yaw contribution, positive steering authority and
V66 corner bite together, preventing their combined inward force from remaining
excessive. Opposing contributions, including countersteering, keep full authority.

During the first 0.28 seconds, a smoothstep envelope brings this gain from 44.2%
to 68%. This is an input-driven force limit, not a position target or apex magnet.
Outward road push and existing lateral inertia interpolation remain unchanged.
Grip and recovery return a gain of 1, retaining V68/V69 recovery behavior.

Physics changed: competitive rules and record keys move from 61.0 to 82.0.
Existing stored records are retained under their previous keys, without migration.
Historical regression assertions now expect the new namespace; other checks stay.

## Validation

`tests/v82-drift-turn-gain.cjs` replays actual `update()` inputs through drift entry
and sustained drift: 110/180/240 km/h, curves 0.6/1.2/2.4, steering 0.5/1.0,
18 configurations plus their left-turn mirrors. Its comparison disables only the
new gain in the test VM; no runtime legacy mode is exposed.

For 180 km/h, curve 1.2, full steering over 0.8 s: inward road-relative X changes
from 0.605912 to 0.394277, a 34.93% reduction. These are normalized road coordinates,
not meters. Every case preserves body yaw, slip angle, speed, drift state and nitro
frame for frame. All cases reduce inward displacement without reversing direction.
Direct identical-state checks cover neutral/countersteer and unchanged grip/recovery.

30/60/120 Hz replay over the same 0.8 s produces X 0.409881/0.394277/0.384990.
The spread is 0.024892 road units. This checks bounded rate variation, not identical
integration. V81 world-space vehicle heading/wheel tests remain in the suite.

The complete npm test suite also covers existing scoring, recovery, replay,
rendering geometry and asset constraints. Automated checks cannot establish the
player's preferred feel. Cloud Chromium has WebGL disabled; public URL/build text
verification is separate from GPU-rendered visual acceptance and FPS testing.

## Superseded by V84

The gain-only test was replaced by `tests/v84-input-led-drift.cjs`. The original
V82/V83 motion is retained in `tests/fixtures/v82-motion.cjs` for actual historical
comparisons. See `V84_Input_Led_Drift.md` for the input-led trajectory revision.
