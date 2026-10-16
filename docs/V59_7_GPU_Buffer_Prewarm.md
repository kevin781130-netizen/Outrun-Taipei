# V59.7 — GPU buffer warmup for Taipei route switching

Based on the V59.6 phase profiling in PR #33: the dominant remaining
synchronous handoff phase was `renderer.render()` / WebGL submission.

The district-geometry prewarm previously created CPU vertex buffers only.
Now, once a fork choice is locked, **at most one cached future landmark
geometry per advancing frame** is inserted temporarily into the existing
WebGL rendering pass, with color and depth writes disabled, depth testing
disabled, frustum culling disabled, and tiny scale. It reuses the exact
BufferGeometry object that will be used during visible route rendering.
The mesh is removed in a `finally` block and its temporary material is
disposed; cached geometry remains managed by the original bounded cache.
No additional render pass is invoked, no physics/nitro/route change occurs.

The existing real Chromium A/B benchmark additionally counts
`bufferData`/`bufferSubData` calls before and at the handoff and
retains stage-by-stage timing in its JSON report. Unit tests validate
one ghost model per frame, no color/depth writes and no gameplay RNG use.

The target is reducing first-visible-frame WebGL geometry uploads, **not**
altering visual art or driving behavior. Software WebGL timing is not
hardware GPU completion time. Visual verification must follow deployment
of an isolated preview. The source main and production Pages route remain
intact.
