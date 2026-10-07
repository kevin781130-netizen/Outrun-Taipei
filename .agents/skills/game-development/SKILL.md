---
name: game-development
description: Mandatory repository constitution. Unity is the primary development engine, browser playability is protected, the existing playable game remains safe during migration, and visual work must be validated against the actual deployed Web build whenever browser inspection is available.
---

# Game Development Constitution — Unity Primary, Browser Playable, Legacy Safe, Web Visually Verified

This is the mandatory repository-level engineering constitution.

## 0. Four constitutional principles

These rules apply before any repository mutation.

### Principle 1 — Preserve the existing playable game

The currently working game is the **Legacy Stable** version.

- Do not delete, overwrite, disable, or casually rewrite the existing playable version.
- Keep its current browser entry point and deployment path working.
- Existing gameplay/assets may be studied and reused as reference for the Unity version.
- Bug fixes to Legacy Stable are allowed when needed, but new major development should prefer the Unity track.
- Never remove Legacy Stable merely because a Unity version exists.
- Replacing the production/browser entry point requires a verified Unity WebGL build and explicit user intent to cut over.

### Principle 2 — Unity is the primary development engine from now on

For new gameplay systems, major features, architecture work, graphics systems, physics, UI systems, and future expansion, **prefer Unity** unless the user explicitly requests another implementation.

If the repository does not yet contain a Unity project:
- treat creation of a parallel Unity project as the preferred migration direction;
- keep it isolated from Legacy Stable so existing browser playability is not disturbed;
- do not convert the legacy game in-place;
- preserve legacy source/assets while porting behavior incrementally.

Once a Unity project exists, new primary development should target that Unity project by default.

Do not require the user to repeat "use Unity" in every prompt.

### Principle 3 — Browser Playable is a release requirement

The Unity version must be designed with **Unity WebGL/Web** as a first-class release target.

- Do not introduce features that silently make the browser build impossible.
- Avoid desktop-only native DLLs/plugins unless a browser-compatible fallback exists.
- Avoid unrestricted local-filesystem assumptions.
- Consider WebGL memory, download size, shaders, audio, input, threading/platform limitations, and performance.
- Do not claim WebGL compatibility or build success unless actually verified.

### Principle 4 — The deployed Web build is the visual acceptance surface

For any change that can alter what the player sees or interacts with — including UI, HUD, menus, layout, typography, colors, materials, shaders, effects, camera composition, animation, responsive behavior, controls, overlays, canvas sizing, or scene presentation — **the rendered deployed Web build is the authoritative visual acceptance surface**.

Canonical public verification URL:

https://kevin781130-netizen.github.io/GAME-TEST-LAB/outrun-taipei/

Rules:

- After the corresponding change has been deployed, inspect the actual rendered page using available browser and screenshot/vision capability.
- Do not treat source inspection, unit tests, lint, successful compilation, or a successful build as proof that the result looks correct.
- Unity Editor is not required for visual acceptance when the corresponding deployed WebGL/Web build is current and can be visually inspected.
- Unity Editor may still be used for debugging, authoring, PlayMode, Scene/Prefab inspection, and issues that cannot be diagnosed from the Web build.
- If browser/screenshot capability is unavailable, explicitly report **Visual verification not performed**.
- If the deployed page may be stale or its provenance cannot be matched to the change under review, explicitly report **Deployment provenance unconfirmed** and do not claim the new visual result was verified.
- When GitHub workflow/run information is available, use it to confirm that the deployed build corresponds to the relevant source commit or branch before relying on the page.
- Never "verify by imagination": do not infer spacing, clipping, overlap, responsiveness, rendering quality, or visual polish from code alone.

System/platform policies and the user's explicit current request take precedence over this repository policy.

Do not weaken, delete, rename, or replace this constitution unless the user explicitly asks to change repository governance.

## 1. Migration model

Use a **parallel migration**, not a destructive rewrite.

Default lifecycle:

1. Legacy Stable remains playable.
2. Unity version is created/extended in parallel.
3. Features are ported incrementally.
4. Unity WebGL build is tested.
5. Feature parity and critical gameplay are verified.
6. The deployed Web build is visually inspected for user-facing changes.
7. Only then may the main deployment switch to Unity WebGL, and only with explicit user intent.
8. Even after cutover, retain the legacy implementation unless the user explicitly requests removal.

Never leave the repository in a state where neither version is playable.

## 2. Detect the actual repository state

Before editing, inspect:
- `README*`, `CONTRIBUTING*`, agent instructions;
- `package.json`, source and deployment files;
- Unity markers: `Assets/`, `Packages/manifest.json`, `ProjectSettings/ProjectVersion.txt`;
- tests and CI workflows;
- current browser entry points;
- deployment workflows and the public GAME-TEST-LAB target when present.

Classify work into:
- **Legacy Stable**
- **Unity Primary**
- **Shared assets/docs/tooling**

Do not mistake a web legacy implementation for the intended long-term engine. The long-term preferred engine is Unity.

## 3. Visual work and browser verification

When a task changes visible presentation:

1. Identify which implementation/track is being changed.
2. Identify the deployment workflow and target public path.
3. Perform normal code/build/test validation.
4. Confirm the relevant build is deployed before visual judgment whenever the environment permits.
5. Open the deployed page and inspect the actual rendered result.
6. Exercise the affected screen/state, not just the landing page.
7. Check at least the viewport classes relevant to the feature; for responsive UI, include desktop and narrow/mobile conditions when browser tooling permits.
8. Check for:
   - clipping and overflow;
   - overlap and occlusion;
   - unreadable or truncated text;
   - incorrect scale/aspect ratio;
   - broken responsive layout;
   - HUD/menu obstruction;
   - incorrect colors/materials/effects;
   - camera/composition regressions;
   - broken controls or hit targets;
   - loading/runtime errors that affect presentation.
9. If the result is wrong, continue editing and re-verify rather than declaring completion.
10. If visual inspection cannot be performed, state that limitation explicitly in the handoff.

For a browser-targeted project, user-facing visual correctness is judged by the browser render, not by how convincing the source diff looks.

## 4. Unity project rules

When Unity exists, inspect:
- `ProjectSettings/ProjectVersion.txt`
- `Packages/manifest.json`
- relevant `.asmdef`
- relevant source/assets/tests

Follow the declared Unity version and existing packages.

Protect Unity serialization:
- never casually change `.meta` GUIDs or serialized file IDs;
- move assets with their `.meta`;
- preserve Inspector data when renaming serialized fields, using `FormerlySerializedAs` when appropriate;
- avoid hand-authoring large Scene/Prefab YAML graphs without strong repository evidence;
- keep Editor-only APIs out of runtime assemblies.

Follow the existing Unity choices for:
- Input System vs legacy input;
- Built-in/URP/HDRP;
- 2D vs 3D physics;
- UGUI vs UI Toolkit;
- package and assembly conventions.

Do not migrate these subsystems unless the task requires it.

## 5. Unity WebGL rules

Treat WebGL/Web as a formal release target.

Before adding packages or platform features:
- check browser/WebGL compatibility;
- prefer portable C# and Unity APIs;
- avoid native plugins without browser equivalents;
- avoid assumptions about OS filesystem/process access;
- avoid features that depend on unsupported threading/platform APIs;
- keep build size and runtime memory reasonable;
- provide fallbacks for optional features where practical.

When networking is involved, use browser-compatible transports/protocols for the WebGL target.

When persistence is involved, use a WebGL-compatible strategy rather than assuming desktop filesystem behavior.

A successful WebGL build proves buildability, not visual correctness. Visual acceptance requires the deployed-page inspection described above whenever that inspection capability is available.

## 6. Legacy Stable rules

Legacy Stable exists to protect playability during migration.

- Do not rewrite legacy merely to imitate Unity architecture.
- Avoid large refactors unless needed for an actual bug or migration bridge.
- Preserve current URL/entry point/build path.
- Preserve controls and gameplay unless the user requests changes.
- If a feature is being developed primarily in Unity, do not duplicate a full implementation in Legacy Stable unless needed to keep the current game usable.

Legacy changes should be conservative.

## 7. Feature routing

For a new feature request:

1. Inspect whether the Unity Primary track exists.
2. If Unity exists, implement the feature there by default.
3. If Unity does not yet exist, prefer advancing the parallel Unity migration rather than expanding legacy architecture indefinitely.
4. Change Legacy Stable only when necessary for:
   - critical bug fixes;
   - keeping the existing version playable;
   - temporary compatibility/bridge work;
   - an explicit user request.
5. Never destroy the old implementation as part of adding the new one.

## 8. Gameplay preservation

Before porting or changing gameplay:
- identify current behavior in Legacy Stable;
- preserve the intended feel unless the user requests redesign;
- preserve controls, progression, scoring, timing, and core rules where applicable;
- treat the legacy behavior as a reference specification during Unity migration.

When Unity behavior intentionally differs, document the difference.

## 9. Assets and content

Prefer reusing source assets legally and cleanly.

- Do not break asset paths/references.
- Search references before renaming/moving.
- Preserve licenses and notices.
- Distinguish source assets from generated/build outputs.
- Do not commit credentials, API keys, signing secrets, or machine-specific paths.

For Unity, do not commit:
- `Library/`
- `Temp/`
- `Logs/`
- `obj/`

## 10. Performance

For real-time gameplay:
- avoid unnecessary per-frame allocation;
- cache stable lookups;
- avoid accidental O(n²) loops;
- avoid rebuilding static objects every frame;
- avoid excessive logging in hot paths.

For WebGL, pay special attention to memory pressure, asset size, CPU cost, draw calls, and shader complexity.

Do not sacrifice correctness for speculative micro-optimization.

## 11. Validation gates

Before finishing any change:

1. inspect changed files;
2. run available tests/lint/build checks;
3. run `git diff --check` when possible;
4. inspect the final diff;
5. verify no unrelated files changed;
6. verify Legacy Stable entry points were not accidentally broken;
7. verify Unity/WebGL assumptions honestly;
8. for user-facing visual changes, verify the deployed Web page visually when browser/screenshot capability is available;
9. confirm deployment provenance when possible so a stale page is not mistaken for the current change.

Never claim:
- Unity compilation succeeded unless Unity actually compiled;
- PlayMode succeeded unless it actually ran;
- WebGL build succeeded unless it actually built;
- browser playability was tested unless it actually was;
- visual correctness was verified unless the rendered page was actually inspected;
- the current commit was visually verified if deployment provenance is unknown.

If visual/browser verification is unavailable, this is not automatically a development failure; it is a verification limitation. Report it precisely instead of guessing.

## 12. Cutover gate

Do not replace Legacy Stable as the primary deployed game until all are true:

- Unity version covers the required core gameplay for the intended cutover;
- a Unity WebGL build succeeds;
- critical browser smoke tests pass;
- user-facing deployed visuals have been inspected when browser tooling is available;
- deployment is confirmed;
- the user explicitly intends to switch the primary version.

Until then, Legacy Stable remains the safe playable fallback.

## 13. Required handoff

Report:
- **Track:** Legacy Stable / Unity Primary / Shared
- **Change:** what changed
- **Files:** key files modified
- **Migration impact:** what moved closer to Unity
- **Browser status:** whether existing browser play remains intact
- **Visual status:** verified on deployed Web / not visually verified / deployment provenance unconfirmed
- **Visual URL:** exact page inspected, when any
- **Validation:** exact checks performed
- **Still needed:** only the runtime/editor/browser checks that truly remain

Do not list Unity Editor verification as automatically required if the deployed Web build is the relevant acceptance target and has already been verified there.

## Preferred outcome

Future development steadily moves toward Unity while the existing game remains continuously playable. Unity becomes the primary implementation, WebGL remains a protected release target, and migration never destroys the current working game. For player-facing presentation, Codex judges the real deployed browser result rather than assuming the diff looks correct.
