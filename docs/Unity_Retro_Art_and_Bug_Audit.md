# Unity Retro Art / Gameplay Bug Audit — 2026-10-07

## Scope and tracks

User requested a Unity-based art evolution that keeps the retro feel and a full gameplay bug inspection. Baseline: `e0c0f0f0b5d84f559e57e4a343423d0d4d4e302d`, Legacy V53.1. There was **no Unity project** at baseline. Repository constitution requires parallel migration.

- **Unity Primary:** Added an original art-validation project, renderer, route data, procedural geometry, fixed-step input/simulation, and Editor build/setup commands. This is a migration foundation, **not completion of the requested whole-game Unity optimisation**.
- **Legacy Stable:** Conservative input/fullscreen bug fixes; original Canvas art/controls/competition rules/production path remain.
- **Shared:** Reference-data/meta validation, bug regressions and this verification record.

## Confirmed fixes

| Bug | Reproduction / consequence | Fix | Regression |
| --- | --- | --- | --- |
| Controller slots 2+ ignored | `getGamepads()` returns `[null,null,null,pad]`; steering/Start never read | Scan all connected slots | `input-lifecycle.cjs` |
| Controller reconnection retains held menu edge | Disconnect while Start was held, reconnect and press Start; press ignored | Reset `gp_` edge flags on disconnect | `input-lifecycle.cjs` |
| Hidden page Start can resume paused simulation | Visibility pauses, then polling sees held Start | Hidden document returns without polling menu actions | `input-lifecycle.cjs` |
| Fullscreen button throws when API absent | Browser has no `requestFullscreen` method | Capability guard and explanatory in-game message | `input-lifecycle.cjs` absent-API click |
| Numeric player ID bypasses duplicate protection | `join({playerId:123})` stores `"123"`; joining numeric 123 again previously could match the player with itself | Normalise ID before duplicate checks; same normalisation in leave | `netplay.cjs` queue + matched-room + leave |

These are verified faults, not speculative changes to handling. No direct messages were sent and production was not deployed.

## Existing gameplay inspection

The original regression suite exercises fifteen routes, sixteen branch paths, projected roadway/landmark clearance, drift and boost together, speed limits and acceleration curves, reverse/gear behavior, traffic collision/close-pass, countdown/timing/checkpoints/finish/records, rendering finiteness and clipping, input and audio lifecycle. Baseline result: **1,235 scenario checks + 8 matchmaker + 12 audio lifecycle**. Fixes add **6 input lifecycle checks + 3 additional matchmaker checks**.

Canvas/Skia raster captures were also generated at fixed route positions for all fifteen routes in both sunset and neon. Those captures show the existing Canvas renderer, **not Unity, browser DOM, mobile layout, or shader compilation**. Scratch test output is ignored by Git.

## Unity study implementation

- Point-filtered 640×360 / 480×270 render targets; 24 colour bands per channel; static ordered dither; weak adjustable scanlines.
- Original flat-lit, vertex-coloured batched road/city geometry; warm sunset and cool neon atmosphere; stable chase camera.
- Fifteen imported reference route identities, route curve keys, physical lengths and time budgets; original landmark silhouettes (tiered tower, palace, wheel, dome, bridge, lighthouse, lantern town, gondola, thermal hills and office blocks).
- New portable fixed-step single-route art-test simulation: steering/throttle/brake, AT/MT, D/R, drift charge, 2-stock 2.8-second nitro, timer, checkpoint, swept traffic contact and crash recovery.
- Focus loss pauses and clears edge input state; multisample touch controls read touches independently; visual yaw remains independent of collision width.
- Separate Editor assembly, GUID-backed source assets, explicit setup/configuration/build commands, pinned Unity version. Generated Unity scenes/profile/settings must be saved and committed from a verified Editor session.

The exact whole-game feature gap is tabulated in `unity/README.md`. Legacy still supplies the complete gameplay. In particular this study does not yet port five-stage progression, full scoring, audio/radio, persistence/tuning, leaderboard, gamepad/gyro or transport. New art still needs visual review in Unity before it can be called an improvement.

## Validation ledger

| Gate | Status in this environment |
| --- | --- |
| Legacy clean-room/content check | Passed |
| Authoritative UI rule label check | Passed |
| Legacy scenario regression | Final passed: 1,235 scenario + 11 matchmaker + 12 audio + 6 input = **1,264 checks** |
| Targeted input/matchmaker fixes | Passed: 6 input + 11 matchmaker checks |
| Unity reference JSON / source .meta GUIDs | Passed: 15 routes, 22 source assets, 22 unique GUIDs |
| JS syntax checks and `git diff --check` | Passed |
| Legacy real-browser smoke | **Blocked**: no local Chromium; browser download failed in restricted environment |
| Unity C# compilation / EditMode / PlayMode | **Not run**: Unity Editor unavailable |
| Unity shaders / art / touch / Web build | **Not verified** |

No assertion of “all bugs eliminated”, Unity compilation, Web compatibility, frame-rate gains or final visual quality is made. The draft PR is reviewable source work with explicit incomplete runtime gates.

## Remaining acceptance work

1. Import with Unity 6000.0.62f1; fix any Editor/compiler warnings; run the authored EditMode tests.
2. Generate the art scene/profile, save Inspector settings and commit generated scene/assets/meta/settings.
3. Capture fifteen routes × two moods in Unity; inspect silhouette fidelity, road clearance, hill clipping, foreground occlusion, UI contrast and comfort. Compare with legacy fixed-state captures.
4. Run PlayMode on keyboard and simultaneous multitouch: gas+steer+drift+nitro, cancel/drag/release, pause/focus resume, reverse, retries, timer/finish, boosted traffic crossings and crash immunity.
5. Build Web; serve via HTTP and verify on desktop Chromium/Firefox/Safari and real iOS/Android, portrait/landscape, browser audio/fullscreen limits, download and memory budgets.
6. Profile representative city/mountain/water/elevated routes; split scenery into visibility chunks or reduce detail if measured GPU/CPU costs demand it.
7. Complete missing gameplay systems and parity checks before proposing a Unity production cutover.

**Migration impact:** establishes the Unity Primary track while keeping the production Legacy Stable game source and deployment available. **Browser status:** source/raster regressions passed; actual browser smoke remains unverified here.
