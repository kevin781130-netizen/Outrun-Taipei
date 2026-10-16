# V59.4 — WebGL route-handoff benchmark

**Track:** Legacy Stable; pure browser test and CI changes only. Stacked on
PR #31 (signs), #30 (landmarks), and #29 (drift-state preservation).

## Reproduction

Run \`npm run test:handoff-performance\` after installing Playwright Chromium.
The report is \`test-results/v59-handoff-performance.json\` and uploads in the
existing GitHub Actions artifact \`game-browser-qa\`.

For an alternate existing checkout, set \`PERF_GAME_ROOT=/path/to/checkout\`;
use \`PERF_OUTPUT\` to control the generated report path.

## Scope

- Four author-defined route transitions: 1A→2A, 1A→2B, 3B→4B, 4C→5D.
- Each transition runs cold and with 12 prewarm render frames, in separate
  actual WebGL worlds. Test order is counterbalanced.
- Measures CPU wall time of the synchronous render call, the number of
  WebGL texImage/subImage upload API calls before/during the switch, scene
  data validity, and drift/nitro state preservation.
- Eight post-transition render samples are captured for each run.
- Only finite/functional assertions are CI-gated; no hard millisecond or
  positive speedup threshold susceptible to hosted-runner noise.

## Limitations

This is a comparison **between cold and warm on the same current revision**,
not a measured before/after of two Git commits. The browser is headless with
SwiftShader, and WebGL draw calls are asynchronous. The observed synchronous
render wall time and API texture call counts are not GPU completion time, real
physical-device FPS, RAF pacing, or proof of visually smooth gameplay.

The production HTML and renderer code are not modified by this benchmark.
Deployment provenance and actual deployed WebGL visual correctness remain
unverified. The public Legacy Stable deployment is untouched.
