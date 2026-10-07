---
name: game-development
description: Mandatory repository constitution. Unity is the primary development engine going forward, browser playability is a protected release requirement, and the existing playable game must remain intact during migration.
---

# Game Development Constitution — Unity Primary, Browser Playable, Legacy Safe

This is the mandatory repository-level engineering constitution.

## 0. Three constitutional principles

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
6. Only then may the main deployment switch to Unity WebGL, and only with explicit user intent.
7. Even after cutover, retain the legacy implementation unless the user explicitly requests removal.

Never leave the repository in a state where neither version is playable.

## 2. Detect the actual repository state

Before editing, inspect:
- `README*`, `CONTRIBUTING*`, agent instructions;
- `package.json`, source and deployment files;
- Unity markers: `Assets/`, `Packages/manifest.json`, `ProjectSettings/ProjectVersion.txt`;
- tests and CI workflows;
- current browser entry points.

Classify work into:
- **Legacy Stable**
- **Unity Primary**
- **Shared assets/docs/tooling**

Do not mistake a web legacy implementation for the intended long-term engine. The long-term preferred engine is Unity.

## 3. Unity project rules

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

## 4. Unity WebGL rules

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

## 5. Legacy Stable rules

Legacy Stable exists to protect playability during migration.

- Do not rewrite legacy merely to imitate Unity architecture.
- Avoid large refactors unless needed for an actual bug or migration bridge.
- Preserve current URL/entry point/build path.
- Preserve controls and gameplay unless the user requests changes.
- If a feature is being developed primarily in Unity, do not duplicate a full implementation in Legacy Stable unless needed to keep the current game usable.

Legacy changes should be conservative.

## 6. Feature routing

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

## 7. Gameplay preservation

Before porting or changing gameplay:
- identify current behavior in Legacy Stable;
- preserve the intended feel unless the user requests redesign;
- preserve controls, progression, scoring, timing, and core rules where applicable;
- treat the legacy behavior as a reference specification during Unity migration.

When Unity behavior intentionally differs, document the difference.

## 8. Assets and content

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

## 9. Performance

For real-time gameplay:
- avoid unnecessary per-frame allocation;
- cache stable lookups;
- avoid accidental O(n²) loops;
- avoid rebuilding static objects every frame;
- avoid excessive logging in hot paths.

For WebGL, pay special attention to memory pressure, asset size, CPU cost, draw calls, and shader complexity.

Do not sacrifice correctness for speculative micro-optimization.

## 10. Validation gates

Before finishing any change:

1. inspect changed files;
2. run available tests/lint/build checks;
3. run `git diff --check` when possible;
4. inspect the final diff;
5. verify no unrelated files changed;
6. verify Legacy Stable entry points were not accidentally broken;
7. verify Unity/WebGL assumptions honestly.

Never claim:
- Unity compilation succeeded unless Unity actually compiled;
- PlayMode succeeded unless it actually ran;
- WebGL build succeeded unless it actually built;
- browser playability was tested unless it actually was.

Clearly report what was validated and what still needs runtime verification.

## 11. Cutover gate

Do not replace Legacy Stable as the primary deployed game until all are true:

- Unity version covers the required core gameplay for the intended cutover;
- a Unity WebGL build succeeds;
- critical browser smoke tests pass;
- deployment is confirmed;
- the user explicitly intends to switch the primary version.

Until then, Legacy Stable remains the safe playable fallback.

## 12. Required handoff

Report:
- **Track:** Legacy Stable / Unity Primary / Shared
- **Change:** what changed
- **Files:** key files modified
- **Migration impact:** what moved closer to Unity
- **Browser status:** whether existing browser play remains intact
- **Validation:** exact checks performed
- **Still needed:** Unity Editor/WebGL/browser verification, if any

## Preferred outcome

Future development steadily moves toward Unity while the existing game remains continuously playable. Unity becomes the primary implementation, WebGL remains a protected release target, and migration never destroys the current working game.
