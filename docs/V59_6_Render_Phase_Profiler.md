# V59.6 — WebGL route handoff phase profiling

**Track:** opt-in render diagnostics in Legacy Stable, stacked on PR #32.

Third argument to \`createFull3DScene(THREE,canvas,{onPhaseProfile})\`
is optional. The game continues to call the renderer with two arguments,
so it never creates phase reports or calls high-resolution timers.

Profiling captures synchronous wall time partitioned into:
\`previewRoad\`, \`viewport\`, \`roadGeometry\`, \`environment\`,
\`landmarks\`, \`roadSigns\`, \`nextRoutePrewarm\`, \`trafficMeshes\`,
\`vehicleCamera\`, \`visibilityEffects\`, \`webglSubmit\`.

The existing 8-case real-Chromium WebGL cold/warm performance test will
include these phase receipts and summaries, retained with GitHub Actions QA.
This helps rank the actual dominant first handoff frame bottleneck.
The user-facing graphics and driving physics are unchanged; the current
deployed Pages preview is not rebuilt by this patch.

NOTE: \`webglSubmit\` times the synchronous Three.js render invocation,
not actual GPU work completion or displayed FPS. GitHub SwiftShader timings
are not stable physical-device benchmarks. No fixed millisecond gate.
