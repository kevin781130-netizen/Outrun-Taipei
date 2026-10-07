---
name: game-development
description: Mandatory repository constitution for game-development changes. Apply before any repository mutation. Detect the actual engine/stack first, preserve the current playable architecture, and only activate engine-specific rules when that engine is actually present.
---

# Game Development Constitution

This skill is the mandatory repository-level engineering constitution.

## 0. Constitutional status

Before creating, editing, deleting, moving, or renaming any repository file:

1. Read and apply this skill.
2. Treat it as the highest-priority repository-level engineering policy.
3. Do not bypass, weaken, delete, rename, or replace it unless the user explicitly asks to change the repository constitution.
4. System/platform policies and the user's explicit current request take precedence.
5. Prefer the safest implementation that preserves current gameplay and deployability.

Read-only inspection is allowed before loading details, but any mutation must comply with this constitution.

## 1. Detect the real engine and runtime first

Never assume Unity, Unreal, Godot, or Web.

Inspect repository evidence before editing.

Common markers:

### Web game
- `package.json`
- HTML/CSS/JS/TS entry points
- `src/`, `public/`, `vite.config.*`, `webpack.*`
- Three.js, Babylon.js, PixiJS, Phaser, PlayCanvas, Rapier, Cannon, Ammo, WebGL, or WebGPU dependencies

### Unity
- `Assets/`
- `Packages/manifest.json`
- `ProjectSettings/ProjectVersion.txt`

### Godot
- `project.godot`

### Unreal
- `*.uproject`
- `Config/`, `Content/`, `Source/`

If markers conflict, inspect the actual build/run entry points before deciding.

## 2. Preserve the current playable path

The current working runtime is the default source of truth.

Do not migrate engines or frameworks merely because another engine is more powerful.

If the project currently runs in a browser:
- preserve browser playability by default;
- do not introduce Unity/Unreal/Godot requirements unless explicitly requested;
- prefer changes that remain deployable to the project's existing static hosting or web deployment path.

If the project currently uses an engine:
- preserve that engine unless migration is explicitly requested.

## 3. Inspect before changing

Read only the relevant files, including when present:
- `README*`
- `CONTRIBUTING*`
- root agent instructions
- package/build manifests
- relevant source files
- relevant tests
- CI workflows
- deployment configuration

Determine:
- runtime/engine and version when declared
- dependencies
- architecture
- naming conventions
- build/test/deploy commands
- existing gameplay systems that may be affected

Do not guess APIs or versions when repository evidence exists.

## 4. Minimal coherent change

Search for analogous code before creating new abstractions.

Prefer:
- extending existing systems;
- reusing established utilities;
- preserving save formats, controls, physics feel, progression, and public interfaces;
- narrow, reviewable changes.

Avoid:
- unrelated cleanup;
- unnecessary manager/singleton layers;
- new frameworks when existing infrastructure is sufficient;
- broad rewrites unless the request requires them.

## 5. Gameplay preservation

When changing gameplay:
- identify the current behavior first;
- preserve unaffected controls and game rules;
- avoid accidental difficulty spikes or progression breaks;
- preserve deterministic/random behavior when it matters;
- avoid changing timing-sensitive mechanics without checking their call/update loop;
- keep tuning values centralized when the project already uses configuration/constants.

For bug fixes, fix the root cause rather than only hiding symptoms.

## 6. Web game rules

When the project is browser-based:

- keep direct browser playability unless explicitly asked otherwise;
- follow the repository's existing JS/TS/module style;
- preserve the current bundler/build system;
- do not add heavyweight dependencies for functionality already available in the stack;
- avoid per-frame garbage creation in hot render/update loops when practical;
- avoid repeated DOM queries or expensive allocations in animation loops;
- respect `requestAnimationFrame`, fixed-step simulation, or the existing game loop;
- preserve mobile/touch controls when present;
- preserve keyboard/gamepad controls when present;
- do not silently require cross-origin-isolated features, WebGPU, SharedArrayBuffer, or special hosting unless the project already uses them or the user explicitly requests them;
- provide graceful fallback when introducing optional modern browser features.

### Web 3D

When using Three.js/Babylon.js/PlayCanvas/WebGL/WebGPU:
- reuse existing scene, camera, renderer, material, loader, and asset-management patterns;
- dispose GPU resources when replacing long-lived geometry/material/texture resources;
- avoid creating meshes/materials every frame;
- preserve coordinate-system and unit conventions;
- preserve asset URLs and loading behavior;
- do not switch rendering engines without explicit migration intent.

### Web physics

When Rapier/Cannon/Ammo/other physics exists:
- follow the existing physics library and timestep strategy;
- preserve 2D vs 3D conventions;
- avoid mixing transform-driven and physics-driven movement without understanding ownership;
- keep render transforms synchronized with physics using the project's established pattern.

## 7. Unity rules

Only activate this section when Unity markers exist.

Before editing inspect:
- `ProjectSettings/ProjectVersion.txt`
- `Packages/manifest.json`
- relevant `.asmdef`
- relevant assets and tests

Protect serialization:
- never casually change `.meta` GUIDs or serialized file IDs;
- move assets with their `.meta` files;
- preserve Inspector data when renaming serialized fields, using `FormerlySerializedAs` when appropriate;
- do not hand-author large Scene/Prefab YAML graphs without strong repository evidence;
- do not claim Editor/PlayMode/build validation unless it actually ran.

Follow the project's existing:
- Input System or legacy input;
- Built-in/URP/HDRP pipeline;
- 2D/3D physics;
- UGUI/UI Toolkit;
- package/version conventions.

Do not migrate these systems unless explicitly requested.

## 8. Godot rules

Only activate when `project.godot` exists.

- follow the project's Godot version and GDScript/C# choice;
- preserve node paths, exported properties, resources, and signals;
- avoid broad scene rewrites when a script-level fix is sufficient;
- preserve input-map actions and project settings unless the task requires changes;
- do not claim scene/runtime validation unless Godot actually ran.

## 9. Unreal rules

Only activate when an Unreal project is detected.

- follow the declared engine/project conventions;
- preserve module boundaries and reflection macros;
- avoid casual binary asset edits;
- prefer source/config changes when no Editor is available;
- preserve Blueprint/C++ interfaces and serialized references;
- do not claim Editor/Cook/Package validation unless it actually ran.

## 10. Assets and references

For all stacks:
- do not break asset paths;
- do not rename/move referenced assets without searching call sites;
- avoid replacing original source assets with generated derivatives unless requested;
- preserve licensing/notices;
- do not commit credentials or private API keys.

If an asset pipeline has generated outputs, distinguish source from generated files before editing.

## 11. Performance

Before optimizing, identify the actual hot path when evidence exists.

In real-time loops:
- avoid unnecessary allocation;
- cache stable lookups;
- avoid accidental O(n²) work;
- avoid rebuilding static geometry/UI every frame;
- avoid excessive logging in production loops.

Do not trade correctness or maintainability for speculative micro-optimization.

## 12. Tests and validation

Use the repository's actual validation tools.

Before finishing:
1. inspect changed files;
2. run relevant tests/lint/build checks that are available;
3. run `git diff --check` when possible;
4. inspect the final diff;
5. verify no unrelated files changed;
6. verify no secrets, local paths, caches, or generated junk were added.

Never claim runtime behavior was validated unless it actually ran.

Distinguish clearly between:
- static/repository validation performed;
- browser/runtime/engine verification still needed.

## 13. Deployment safety

Preserve the project's existing deployment path unless change is requested.

For browser games:
- keep entry points and asset paths compatible with hosting;
- avoid absolute local filesystem paths;
- preserve GitHub Pages/static hosting compatibility when that is the current deployment model.

For engine projects:
- preserve CI/build configuration and artifact expectations.

## 14. Required feature workflow

1. Detect engine/runtime and version.
2. Read relevant architecture and closest analogous implementation.
3. Identify minimum affected files.
4. Implement narrowly.
5. Update tests when practical.
6. Search for stale symbols/broken references.
7. Review diff.
8. Run available validation.
9. Report:
   - what changed;
   - important files;
   - validation actually performed;
   - runtime/engine checks still required.

## 15. Required bug-fix workflow

1. Trace the failing path from repository evidence.
2. Identify the smallest plausible root cause.
3. Check call sites, state ownership, timing, and references.
4. Fix the root cause.
5. Add regression coverage when practical.
6. Review and validate honestly.

## 16. Git and repository safety

Respect `.gitignore`.

Never add:
- credentials/secrets;
- local IDE caches;
- machine-specific paths;
- engine caches/build intermediates unless the repo intentionally tracks them.

For Unity specifically, do not commit `Library/`, `Temp/`, `Logs/`, or `obj/`.

## 17. Handoff quality

A good handoff states:
- **Change:** behavior added/fixed
- **Files:** important files modified
- **Compatibility:** relevant engine/runtime/dependency assumptions
- **Validation:** exact checks/tests run
- **Needs runtime verification:** what still needs browser/engine testing

Do not overstate validation.

## Preferred outcome

A good change preserves the project's current playable architecture, improves the requested behavior with the smallest coherent diff, remains deployable through the existing path, and never forces an engine migration without explicit user intent.
