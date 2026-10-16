# V59.2 · Prewarm the chosen district before the 3D switch

Track: Legacy Stable visual-performance experiment stacked on PR #29.

## Source-level cause
`TaipeiLandmarks.update()` generated whole merged geometries synchronously
when a route ID changed. Complex landmark models create many short-lived
box/cylinder/torus geometries. That work coincides with district handoff.

## Independent fix
- Only after the arcade fork is locked, the presentation snapshot advertises
  `nextRouteId`. Does not modify player selection or handling.
- One **missing** upcoming merged geometry at most per active render frame.
- Reuse prepared geometry during route swap; each active landmark keeps an
  independent mesh/material, fading and placement.
- Keep max eight geometry models resident; pin active and upcoming models.
- Dispose cached geometry on scene teardown.
- Update generated bundle and add a dedicated regression.

## Not claimed
Signs/canvas textures and first-time GPU uploads can still hitch. Unit/CI
results alone cannot establish frame pacing. Validate the PR's exact WebGL
preview in real play before promoting it. Original game and deployment stay intact.
