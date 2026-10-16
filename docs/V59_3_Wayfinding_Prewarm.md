# V59.3 — Next-district road-sign texture/material prewarm

Stacked experiment on PR #30, which includes PR #29's drift handoff fix.

The original `RaceWayfinding.update()` synchronously painted 1024×256
CanvasTextures and allocated a MeshBasicMaterial for *every* road sign whenever
the route or sign set changed. The route boundary coincided with this work.

After the fork is locked, a pure authored-sign preview builds the next route's
labels and geometry metadata without mutating stage state. One missing
CanvasTexture and its MeshBasicMaterial is prepared per advancing render
frame; Three WebGLRenderer.initTexture uploads it ahead of the route switch
when the API exists. Resources are reused at the switch and the cache is
retained only for active and queued sign sets. Stale signs and materials are
disposed and teardown releases all resources.

The regression validates the preview against all 14 destination districts,
sign-text/material reuse, one preupload per frame, lifecycle, and no gameplay
randomness contamination.

No changes to driving, route geometry, nitro, collision or landmarks.
CI does not establish a measured GPU frame-time improvement; a matching
deployed WebGL playthrough remains required. Main and public preview untouched.
