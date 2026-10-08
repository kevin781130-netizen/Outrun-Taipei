# V56.1 — DRIFT-00 qualification and runtime gate (PR #21)

## Historical evidence
Compared `backup/main-pre-v55-20261008` (older physics), `backup/main-pre-v56-20261009` (V55 reference), and `fix/v56-1-drift-3d-sync`. The regions containing the `DRIFT51` handling rules and `stepBrakeDrift` / `stepArcadeMotion` are byte-identical; FNV-1a: `106f1ac2`, `51090577`, `511b772f`.

## DRIFT-00 real game logic replay — PASS in V8 simulation harness
On 2026-10-09, a JavaScript V8 harness loaded the **unmodified** original gameplay bootstrap from GitHub for both V55 and PR #21, using a stub 2D canvas for non-physics rendering. It executed `update(1/60)` for 108 frames in each of seven input scenarios with the test's fixed PRNG seed. The test code is `tests/v56-drift-replay.cjs`. It used the same harness contract as `tests/canvas-harness.cjs`; it did **not** use Node's `@napi-rs/canvas` or a real browser.

Results: all seven deterministic scenarios passed, **all 108 × 7 physical state frames matched the V55 baseline exactly** for the replay's recorded fields, and the state machine entered and recovered cleanly in all seven cases:

| Scenario | Phase progression | Peak visual yaw |
|---|---|---:|
| Straight right + Shift | entry → drift → recover → grip | 30.0° |
| Straight left + Shift | entry → drift → recover → grip | 30.0° |
| Right curve | entry → drift → recover → grip | 46.1° |
| Left curve | entry → drift → recover → grip | 46.1° |
| Countersteer | entry → drift → recover → grip | 41.9° |
| Lift throttle | entry → drift → recover → grip | 40.5° |
| Nitro while drifting | entry → drift → recover → grip | 45.4° |

This gives physics parity evidence for these synthetic test roads, not proof of road feel on all fifteen real tracks. Source and frame-by-frame parity are **not** WebGL visual acceptance.

## DRIFT-05 Chromium WebGL test gate — created, not run
The draft PR includes `tests/v56-drift-browser.cjs`, wired to `npm run test:browser` and available as `npm run test:drift-browser`. It uses the actual game's DOM keyboard input and a test-only view into the Three.js render traversal to check mirrored 3D yaw, bounded car sway, chase camera, countersteer, N boost while drifting, nitro charge, and exhaust flames. It writes `test-results/v56-drift-browser/verification.json` and screenshots only **when actually executed**. The test-only diagnostic hook is never shipped.

## Environment blockers (verified 2026-10-09)
- GitHub Actions workflow `37834998947` failed on its initial run **and its second retry** in 3–4 seconds. The retry has `runner_id=0` and `steps=[]`: GitHub did not allocate a runner. Multiple Main/other-branch runs have the same symptom. This is **not a test assertion failure**; the exact billing/entitlement/runner cause has not been confirmed.
- The local verification container can launch Chromium 144 using Python Playwright, but a standalone `canvas.getContext('webgl')` fails with `BindToCurrentSequence failed`, including with software/SwiftShader flags. The local environment also has no `/dev/dri`. Therefore no actual V56 3D frame/screenshot QA was possible here.
- **Node/Skia replay execution NOT confirmed**; V8 hermetic replay is independently confirmed. **Actual WebGL visual QA NOT performed. Deployment provenance unconfirmed.**

## Acceptance remaining
1. Restore GitHub-hosted Actions runner allocation (check repository-owner account Actions billing/payment/limits and runner access; do not assume billing is the confirmed cause).
2. Run `npm test && npm run test:browser` on a computer with a functioning software/hardware WebGL context; archive test logs and compare the images with the V55 reference.
3. Fix any actual failing test and then review DRIFT-03 chase camera, DRIFT-04 tyre FX and DRIFT-05 mobile controls/HUD/scoring.
4. Keep PR #21 as draft; do **not** merge Main or publish until screenshots, real browser behavior and regression gates are confirmed.
