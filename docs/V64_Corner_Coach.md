# V64 — Corner Coach (speed feedback, not another scoring system)

## Goal
After players enjoy the V60 handling and V61–V63 corner mechanics, supply
useful practice feedback. **No new score bonuses or physics changes.**

On an existing V61 qualified APEX exit, the game records:

- speed when the bend challenge was first armed;
- speed on the valid bend exit;
- coarse location / directional identity, using route ID, maximum curve
  direction and the bend's start segment grouped in 40-segment buckets;
- the last exit speed and best exit speed at that matching location,
  in the current browser page session only.

A compact result is shown inside the existing corner advice HUD for
4.5 gameplay seconds:

`入 190 → 出 182 KM/H · 較上次 +12 · 最佳 182`

The first observation displays `首次紀錄`. Comparisons use **previous
valid exit speed**, not average speed, fastest time, or a promise that the
overall racing line was objectively optimal. A larger exit speed can be
helpful but is not itself a validated record lap.

## Non-interference
- V60 speed / acceleration / grip / drift / steering / nitro / camera / route
  layout are unchanged.
- V61 APEX scoring, V62 FLOW, V63 SWITCHBACK points are unchanged.
- `COMPETITION.version` stays **57.0** because physics and score rules
  are identical to V63; only observability changes.
- No new persistent keys, network writes, or telemetry export. A bounded
  `Map` stores at most 64 corner locations per page session. Restarting
  a race preserves those comparisons; refreshing the browser forgets them.
- Invalid corner attempts and off-road / crashed bends are not recorded.
  Changing a route or starting a new race immediately clears the active
  transient HUD report, but not the per-session history.
- The result is drawn **inside the existing corner HUD** and does not cover
  the speedometer. The previous FLOW overlay is moved above that HUD,
  avoiding its bottom-right overlap in V62–V63.

## Checkpoint
User-approved V60 source and GAME-TEST-LAB preview recovery branches remain
`checkpoint/v60-user-approved-20261017` and
`checkpoint/outrun-v60-user-approved-20261017`. V60, V61, V62 and V63
preview directories are untouched by this branch.

## QA
`tests/v64-corner-coach.cjs` asserts the actual V61 award's speed
measurements, positive/negative comparisons, best-speed retention, route
and direction independence, pause freeze, display expiration, race-reset
behavior, fixed 64-entry memory bound, unchanged score namespace, and
unchanged car physics during reporting. Existing regression and Chromium
browser smoke suites remain required. Human visual inspection of a
matching deployed build is also required before promotion.

This is a small experimental Legacy-Web enhancement; major future systems
should be implemented in parallel on the Unity Primary track.
