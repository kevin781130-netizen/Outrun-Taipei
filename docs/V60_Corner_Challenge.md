# V60 — High-speed corner challenge (experimental / stacked on V59)

## Scope
Track: **Legacy Stable, isolated handling calibration**. No new framework or
runtime dependencies. Existing route map, 15 stages, 27 3D landmarks,
collision engine, drift entry/recovery equations, nitro and controls remain.
The default public browser build is **not** replaced.

## Why this calibration
The current V52 safe-speed curve was lenient: a moderate 2.4-curve at
250 km/h only exceeded the recommended speed by ~30 km/h. As a result,
high-speed grip driving offered too little penalty compared with a
controlled drift.

V60 tightens only the shared safe-speed curve and over-speed grip penalty:

| Physics control | V59 | V60 |
| --- | ---: | ---: |
| Safe straight-speed reference | 278 | 278 |
| Safe-speed reduction per absolute curve | 24 | 34 |
| Minimum safe recommended speed | 120 | 120 |
| Understeer onset span (km/h) | 90 | 75 |
| Peak understeer gain | 0.13 | 0.17 |
| High-speed grip scrub | 0.45 | 0.51 |

At curve 2.4, recommended corner entry is ~196 km/h (previously ~220).
Above that entry speed, grip driving receives more outward push and speed
loss. The understeer curve now adds a **bounded soft tail** after its nominal
span (up to +20% normalized gain), so a 285 km/h hairpin still pushes more
than the same hairpin at 260 km/h. In a clean drift, the *existing* much
lower drift scrub formula is unchanged. Straight-line speed, boost tops, acceleration and steering input
equations are unchanged. Settings are an initial hypothesis pending
human feel evaluation, not a measured optimal balance.

## HUD feedback
The existing corner advisory shows actual excess speed in km/h and flags
understeer risk; a near-limit advisory distinguishes marginal over-speed
from clearly excessive entry speed. This uses current speed and same
safe-speed calculation as physical handling, not a parallel HUD rule.

## Ranked fairness
Changes to physical corner rules require a competition rules version bump:
`COMPETITION.version='54.0'`. Existing local record keys are naturally
separated from V53 rules so old leaderboard scores are not mixed.

## Validation gates
- `node tests/v60-corner-challenge.cjs` checks straight/medium/tight/extreme
  corner recommendations, left/right understeer symmetry, speed drop at
  grip pace versus drift pace, speed-capped outputs, HUD messages, and
  local record key separation.
- Existing `npm test` deterministic replay is retained, with the expected
  competition revision updated from 53.0 to 54.0.
- Browser tests must run against the exact V60 branch; render snapshots are
  not proof of desired game feel. Visual verification not performed until
  matching deployed branch is reviewed.

## External references
The V59 research includes SuperTuxKart skid-state control, VDrift slip-aware
scoring, and wipEout camera smoothing. V60 is independent calibration, not
ported/copied code from GPL repositories.

## Release gate
Keep as review/preview until deterministic suite, browser smoke and human
driving comparison approve corner difficulty across urban, coastal,
mountain and expressway stages. Do not merge automatically.
