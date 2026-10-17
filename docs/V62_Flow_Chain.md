# V62 — FLOW CHAIN (stacked on V61, with V60 approved checkpoint)

## Why
Reward consecutive good corners, not higher raw speed or longer nitro. Keep
approved V60 vehicle physics and V61 single-corner scoring untouched.

## Rule
- Earning an existing valid V61 APEX award opens a 16-second FLOW window.
- Earning another qualified APEX before the window expires increments the
  chain to a maximum of 4, extending the 16-second window.
- Bonus on each successful exit: 0 / 120 / 240 / 360 points for chain levels
  1 / 2 / 3 / 4. Existing clean 240 and perfect 650 points remain unchanged.
- A crash, road-grip loss, route/stage switch, or deadline expiry clears
  the current chain. Pausing freezes the in-game window.
- `flow-chain` HUD appears in the game's bottom-right and counts down
  only during an active chain; no animation or GPU effect is added.
- A linked award uses existing STYLE popup, preserving the APEX grade and
  reporting base points separately from bonus.
- Competition score namespace changes from `55.0` to `56.0` because scores
  are now different; prior V60 and V61 leaderboards remain segregated.
- **No changes** to drift steering response, recovery, nitro charge, speed,
  boost, collision geometry, camera, terrain, or route geometry.
- Physics and score changes are separate: the V61 qualifier returns an
  existing award object, which the V62 scoring layer consumes.

## User-approved checkpoints (not overwritten)
- `Outrun-Taipei/checkpoint/v60-user-approved-20261017`
  -> `7dd64411e08143c355218dd57b5b01bf8b32db8a`.
- `GAME-TEST-LAB/checkpoint/outrun-v60-user-approved-20261017`
  -> `95dc64fb73e74efd55c66d1d1b880f1c53609591`.
- V60 preview: `outrun-taipei-v60-corner-preview/`.
- V61 preview: `outrun-taipei-v61-apex-preview/`.

## Tests
- New `tests/v62-flow-chain.cjs` covers APEX chaining,
  timeout, cap, crash and stage resets, pause freeze and HUD states.
- `npm test` runs V60 and V61 regression gates as well as V62.
- `npm run test:browser` is required for browser acceptance.
- Matching deployed browser visual verification is separately required and
  not implied by passing automated tests.

## Release policy
This remains a new, isolated browser experiment atop Legacy Stable.
For major future work, use the Unity Primary migration track rather than
replacing the approved browser game.
