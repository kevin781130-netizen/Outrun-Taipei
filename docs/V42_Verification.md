# V42 verification

Base: `572e4354780fc52bd8e756571f5eda4c291b39f4` (V41 main).

## Checks completed locally

`node tests/regression.cjs` passed **768 assertions**, using a real Skia Canvas and a minimal DOM shim. These verify game simulation and raster execution, not browser layout or audio permissions.

- 15 routes × arcade/sprint geometry × sunset/neon × five road positions.
- Shared segment endpoint heights; finite projected coordinates and hill clipping.
- Coastal dry-land landmark constraints, facade clearance and highway scooter exclusion.
- Left/right boundaries on regular road, forks and transition lanes.
- Two stored boosts; overflow carry; low-speed lock; boost-time charging; brake cancellation; held-N edge handling; legacy Z→A timing.
- Swept traffic contact in forward/reverse travel; adjacent-lane separation; actual update crash; barriers.
- Pause freezes position, time and boost; all input devices clear together.
- Corrupt leaderboard shapes/entries, all 16 branching paths, checkpoints, stage overshoot, five goals, sprint timing, cruise looping and new-run reset.
- Local Canvas images visually inspected for civic streets, both expressways and coastal routes. Screenshots are test artifacts, not runtime assets.

## Browser checks

`.github/workflows/verify.yml` runs the same regression scenarios inside Chromium, then real keyboard/pointer/menu interactions at desktop 1280×800, phone 390×844 and landscape 844×390. Screenshots and `verification.json` are uploaded as `game-browser-qa` for review.

The editing environment has no Chromium binary and its browser download was unavailable. Browser validation therefore runs in GitHub Actions; check the PR's `Verify game` result before merging.

## Scope

This remains a Canvas pseudo-3D arcade game. Collision uses a swept world-space vehicle box aligned with the camera's chase distance, plus road corridor barriers; it is not a general-purpose mesh physics engine. The crash recovery animation intentionally separates passengers and the car.

Automated samples cannot prove the absence of every visual overlap in every frame. Safari/iOS audio permission handling, real controllers, gyro devices and subjective drift feel still need device playtesting. No deployment or main-branch merge is performed by the test workflow.
