# OutRunners reference integration — input evidence, slice 01

Track: Shared diagnostics/tooling. Base: `b9bcbb0ce4772146d698cf0fa990c1191a69c93b`.
Branch: `feature/outrunners-input-evidence-20261016`.

## Implemented

- `src/diagnostics/InputEventTrace.cjs`: bounded digital-event journal, per-step held/edge snapshots, versioned JSON export and deterministic event/sample replay. Equal timestamps preserve sample boundaries through explicit event counts. Duplicate held states are ignored; capacity exhaustion marks capture incomplete and prevents replay acceptance. Exports are independent copies.
- `tests/outrunners-input-evidence.cjs`: dispatches through existing keyboard handlers in the VM harness and runs the real, unmodified `update(1/60)`, for default and `?handling=v59` profiles. Compares observed vs unobserved physical state, replays recorded events through actual handlers, and validates trace ordering/capacity.
- `npm run test:input-evidence`; included in `npm test`.

## Finding reproduced

Controlled simulated keyboard events: W down at 1 ms, N down at 4 ms, N up at 8 ms, first simulation update at 16.667 ms. Both handling profiles retain one nitro and do not boost. The journal retains both N edges. Moving N release to 24 ms consumes exactly one nitro on the first update and activates boost. This demonstrates a sub-step N pulse missed by the current level-sampling path under these controlled conditions.

This is **VM simulation evidence**, not browser/device timing measurement. The recorder is invoked by tests; it is not installed into the shipping game's event loop. It does not fix the missed pulse in this slice. Gamepad sub-frame transitions cannot be recovered from browser level polling alone; no such claim is made here. Pointer and focus/pause event capture are also not integrated yet.

## Reference boundary and preservation

The supplied Stage13/19/20 analyses informed the general distinction between event edges, snapshots and history. Implementation and protocol are independent; no ROM constants, memory addresses, tables, reconstructed functions or original assets were copied into runtime files. Stage35 coordinate candidates and unconfirmed drift/collision formulas are not handling parameters.

`index.html`, renderer/assets, route data, physics, controls, rankings and production deployment are unchanged. This prepares engine-neutral input fixtures for a later Unity port; it does not create a Unity project or claim a Unity/WebGL build. No deployed-page visual acceptance was performed; this slice changes test/tooling only.

## Validation executed

- `node tests/outrunners-input-evidence.cjs`: PASS.
- `npm test`: PASS, including 1,235 core regression checks, seven drift replays, 24 V59 handling simulations, 15-route/27-landmark checks and the existing V60–V68 traffic suites.
- `node --check` for both added CJS files and `git diff --check`: PASS.
- `git diff --exit-code HEAD -- index.html assets data`: PASS (shipping game, renderer and route assets unchanged).
- Browser/deployed visual tests and MAME/REA were not run. No original physics formula is confirmed by these tests.

## Next slice

Design an opt-in event-consumption bridge, with pause/focus reset and one-action-per-press guarantees. Prove baseline equivalence and keep rankings isolated if simulation behavior changes. Do not replace drift/collision formulas with unverified reverse-engineering candidates.
