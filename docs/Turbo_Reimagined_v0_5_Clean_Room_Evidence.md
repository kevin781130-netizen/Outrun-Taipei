# Turbo OutRun Reimagined v0.5 — reference inspection and clean-room fusion gate

Date: 2026-10-15  
Track: Shared research / future Unity Primary. Existing playable WebGL version remains unchanged.  
Target branch: `feature/turbo-reimagined-cleanroom-20261015`  
Baseline: `feature/v59-countersteer-taipei-world-20261014` @ `2d8576707811eccb211949a118c9e0482f2638dc`  
Do not merge into `main` without separately verified gameplay, browser and deployment gates.

## 1. Evidence actually examined

User-supplied reference archive: `Turbo OutRun Reimagined v0.5 test.zip`.

- ZIP: 338,352,070 bytes; SHA-256 `0af2ef701d97cccfd5ade659aa69162284dc187adf9053448dbe99af025ba4b0`.
- 284 ZIP entries; uncompressed size 567,580,439 bytes; no absolute or `..` traversal entry found.
- `Turbo OutRun Reimagined_Data/Managed/Assembly-CSharp.dll`: 657,920 bytes; SHA-256 `98e2b1fdba199f6c3d82b2ca51a019f6abfaeee8fe20290d8337230ac9d825b2`.
- `MonoBleedingEdge/`, `ScriptingAssemblies.json`, Unity engine libraries and `UnityEngine.InputSystem.dll` indicate a Unity Mono-managed Windows release.
- Contains Unity serialized scenes and large `sharedassets*` resources, plus numerous bundled music recordings. **None may be copied to this repository merely because the archive was supplied for inspection.**

Inspection method used in this pass: archive inventory, SHA-256, readable .NET assembly string/identifier triage **without launching the game**. This is preliminary static evidence, **not** successful REA CIL inspection, source restoration, gameplay proof, or licensing clearance. REA's `inspect-managed-artifact` and `inspect-managed-members` are suitable for a later bounded PE/CLI evidence pass; the REA CLI was unavailable in the analysis runtime (external package registry unavailable).

### Candidate mechanical systems suggested by managed identifiers

| Candidate | Actual observed identifiers (not recovered logic) | Taipei integration decision |
| --- | --- | --- |
| Competitive AI traffic movement | `AIChangeLanes`, `maxSpeedThroughCornerAI`, `GetTorqueAI` | **High-interest:** original deterministic lane/spacing planner, separated from existing collision and route graph |
| AI catch-up / pacing | `minRubberBand`, `maxRubberBand`, `rubberBandThrottle` | **Conditional:** single-player, opt-in only; must never manipulate verified race results or online fairness |
| Braking / corner response | `BrakeUpdate`, `understeerLerp`, `GetGearRatio`, `ChangeGear` | **Gap-check first:** V59 already has LOW/HIGH and a separate countersteer profile; do not overwrite it |
| Turbo mechanics | `TurboUpdate`, `SetTurboActivated` | **Gap-check first:** preserve existing nitro charge, stock, trigger, 2.8s use and original speed rules |
| Chase and collisions | `PoliceIntensityUpdate`, `CrashUpdate` | **Defer:** V59 already has an original 3D crash-chase presentation. New pursuit would change gameplay identity |
| Damage and repairs | `GoToRepairScreen`, `gearDamage` | **Reject default integration:** adds penalties/progression that conflict with existing arcade loop |
| Atmosphere | `RainSound`, `rainParticleSystem`, `SetAmountOfRain` | **Possible renderer-only enhancement:** original Taiwan-localized atmospheric profiles; do not import source audio |

**Inference limit:** names can demonstrate the presence of declarations, not equations, gameplay outputs, user-visible quality or completeness. No handling curves, AI thresholds, driving figures or recognizable code were transferred.

## 2. Protect the actual latest Taipei branch, not an older main

`main` currently points to V58 @ `77b8d72beb23e9d1a06b2db2c4e5618e32857d60`. The V59 branch above is **eight commits ahead**, containing the requested opt-in countersteer, comedic 3D crash-chase, and Taipei district geography. This new branch must start from V59 to avoid silently discarding recent progress.

Protected contracts:

1. Original 15 Taipei/New Taipei routes, their names, forks, 27 landmarks, terrain types, route graph, collisions, checkpoint timing and traffic corridors.
2. Original baseline driving controls, LOW/HIGH and AT/MT, and legacy replay fingerprints.
3. V59 `?handling=v59` opt-in countersteer and its isolated score keys; default game remains unchanged.
4. Existing crash / recovery clocks, nitro system, race scores, rankings and recorded competition versions.
5. True rivers, harbor, coastal sea, mountain/tea district and overpass constraints from V59 geography; no invented elevated road.
6. Game RNG isolation and finite/repeatable rendering; Low quality and browser/WebGL fallback must remain operational.
7. No original archive, DLL, ROM, source reconstruction, music, character/vehicle identities, logos, sprites or textures in repo or shipping artifacts.

## 3. Next isolated implementation slice (not yet shipped)

**Priority: deterministic AI lane-intention / close-pass planning.** Define a new pure JavaScript module with bounded, seeded input and 60/120 Hz stability for offline preview. Add replay tests for forward gap, rear gap, fork exclusions, lane-change cooldown and both travel directions. Connect it to existing AI only behind an opt-in flag after equivalence checks prove that default route geometry, player physics, collision counts, score and V59 visuals remain byte-for-byte unchanged. No hidden rubber-band boost for online/leaderboard results.

Secondary opportunities require separate evidence and sign-off: visual weather (Taipei-specific, no grip change) and offline rival pacing. Never transplant the reference game's algorithms or arbitrary numeric tables.

## 4. Required verification before any claimed integration

- `node tests/clean-room-compliance.cjs`
- `npm test`, including existing `v59-countersteer`, `v59-crash-chase`, `v59-geography` suites.
- Deterministic replay / baseline fingerprint and all 15-route / 27-landmark preservation checks.
- Browser smoke on desktop and mobile, actual WebGL gameplay and screenshots; no game-state mutation from rendering.
- Actual deployed page and commit provenance verification if a preview is published; do not claim visual approval from a source diff.

**Current state:** research gate and isolation branch only. No ported game mechanic, no Unity project, no full managed CIL decompilation, no changed production browser entry point, no runtime/visual acceptance claimed.
