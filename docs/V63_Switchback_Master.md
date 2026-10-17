# V63 — SWITCHBACK MASTER: alternate-turn challenge

## Design intent
A small, scoring-only evolution of V62 Flow Chain and V61 Apex, using the
approved V60 arcade handling untouched. Gives genuine S-bend and mountain
routes a skill distinction beyond simply repeating apex awards.

### Scoring
- V61 qualified bend yields `CLEAN CORNER +240` or
  `PERFECT APEX +650` as before.
- V62 FLOW chain retains 16-second window, four-level cap and
  +0/+120/+240/+360 score bonus.
- **V63 SWITCHBACK MASTER +300** when two consecutive *earned* apex
  exits inside the *same active* FLOW window have opposite dominant road
  curvature signs. Consecutive right/right or left/left corners grant
  no switchback bonus. The first turn of a new chain cannot qualify.
- Direction is the signed maximum-magnitude curve within each V61
  qualifying bend, not steering input or the player's lateral offset.
  A bend that changes sign mid-corner still contributes only one earned
  direction. A failed/short/off-road bend cannot overwrite the last earned
  direction, and earns no points.
- Existing STYLE popup shows `SWITCHBACK MASTER!`, with APEX, FLOW and
  S-TURN score contributions itemized. No new graphics resources.
- Crashing, leaving the road, changing stage, or FLOW expiry resets the
  direction register. Pausing freezes the 16-second window.
- V63 retains a run-only count of Switchback awards, cleared by
  `resetGame()` and not used to modify physics.

### Compatibility and release safety
- **Zero change to V60 speed, steering, drift, traction, nitro, boosts,
  camera, route data, collision parameters or rendering assets.**
- Ranking namespace bumps from `COMPETITION.version='56.0'` to
  `'57.0'` so V60/V61/V62 scores remain separated.
- V60 source checkpoint:
  `Outrun-Taipei/checkpoint/v60-user-approved-20261017`
  at `7dd64411e08143c355218dd57b5b01bf8b32db8a`.
- V60 public checkpoint:
  `GAME-TEST-LAB/checkpoint/outrun-v60-user-approved-20261017`
  at `95dc64fb73e74efd55c66d1d1b880f1c53609591`.
- V60, V61, V62 previews and public production directory must not be
  overwritten. Deploy to a separate V63 preview directory.

### Tests
`node tests/v63-switchback-master.cjs` verifies left/right/same-turn
bonus rules, score increments, popup messaging, unearned bend immunity,
FLOW expiry, stage boundary/crash handling and clean new-game reset.
Existing V60–V62 physics and score regressions remain part of `npm test`.
The Playwright Chromium browser suite must also pass before preview
acceptance. Screenshots and subjective live-device feel require a
matching public deployment; tests alone cannot certify visuals.

Major future systems should target Unity Primary in a parallel project,
but V63 is a deliberately small isolated upgrade to the user's
approved browser game.
