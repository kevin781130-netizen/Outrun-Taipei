# Input edge nitro — slice 02

Track: Legacy Stable bug fix, opt-in. Base `0748b45809262f9c16f874e0164f69097752180e`.
Branch: `feature/input-edge-nitro-20261016`.

## Select before starting

Open the branch's `index.html?input=edges1`, or `index.html?input=edges1&handling=v59` for countersteer handling. The flag is fixed at page startup. No flag keeps the existing input path. Both time records and arcade rankings gain `:I1` when selected, alongside existing profile suffixes.

## Behavior

Keyboard N and the on-screen nitro button retain an accepted press until the next eligible simulation update, even when released before that update. The pending flag coalesces multiple presses before a step into one request; it is not a backlog of future boosts. OS key repeat and continued holding do not enqueue another request. Gamepad Y retains polling-based edge detection; transitions occurring entirely between gamepad polls remain outside this fix.

The request is consumed on the next driving update even when braking, reversing, below minimum speed, already boosting or out of stock prevents activation. It cannot wait for a later refill or the end of a boost. Requests are cleared on input reset, pause, blur, hidden-tab pause, game reset, crash and driving-state reset. Inputs during countdown, pause, menus or a crash do not queue a request. Existing nitro duration/capacity/speed rules remain authoritative.

Implementation: small guarded changes in `index.html`; no new shipped scripts, dependencies, assets or deploy changes. `tests/tools/input-edge-cases.cjs` shares behavior cases between VM and Chromium tests. `tests/input-edge-nitro.cjs` also exercises actual registered touch-button, blur and visibility handlers in the VM harness. `tests/input-edge-nitro-browser.cjs` uses Playwright keyboard down/up/repeat and a local test-only lexical bridge with automatic frames disabled, isolating before-update pulses.

## Preservation and limits

Taipei routes, landmarks, renderer, drift equations, nitro tuning, the default score keys and production branch are preserved. This is an independently implemented input-delivery fix informed by general event/snapshot architecture. No original ROM formulas or reconstructed source were ported. No Unity project is introduced; existing input fixtures remain useful for a future parallel port.

Local simulation tests do not establish physical keyboard latency, touch-screen timing or real phone FPS. Local Chromium, when available, is still not verification of the corresponding deployed public build. This branch is not deployed and public visual acceptance is not claimed.

## Checks

- `npm run test:input-edges`: default/V59, rapid press/release, long hold/repeat, fresh re-press, pause/resume, brake/reverse/refill rejection, crash reset, countdown, simultaneous keyboard/gamepad, gamepad release/rearm, VM pointer/blur/visibility.
- `npm run test:input-edges-browser`: real-browser version of shared keyboard cases; requires installed Playwright Chromium or `CHROMIUM_PATH`.
- `npm test`: all existing simulation, rendering-model and traffic regression gates plus the new input tests.

## Execution status

- New VM input suite: PASS for default and V59, including both drift directions with boost and continued charge. The updated focused suite was rerun after adding low-speed/in-progress-boost cases.
- `npm test`: PASS, including 1,235 core checks, seven existing drift replays, 24 V59 simulations, 15 routes/27 landmarks and V60–V68 traffic gates.
- `DRIFT_BASELINE_INDEX=test-results/input-baseline/index.html node tests/v56-drift-replay.cjs`: PASS; all seven default physics traces match the actual prior `0748b45` runtime, not just a repeated current run.
- `node --check tests/input-edge-nitro-browser.cjs`, `git diff --check`: PASS.
- `git diff --exit-code HEAD -- src assets data .github`: PASS; rendering, route data, existing shared modules and deployment unchanged.
- Chromium test: BLOCKED before launch, because the required browser executable is absent. The installed Playwright CLI's browser-download retries all failed with an empty/truncated ZIP (`End of central directory record signature not found`). No real-browser or deployed visual PASS is claimed. The browser test is committed and intentionally remains a failing gate until Chromium is installed.
- MAME/REA and Unity/WebGL builds: not run; not evidence of any original drift/collision formula.
