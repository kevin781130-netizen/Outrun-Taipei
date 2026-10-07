---
name: game-development
description: Mandatory repository constitution for game-development changes. Apply before any repository mutation. Browser playability is the primary delivery constraint; detect the real engine/stack first and preserve the current playable path.
---

# Game Development Constitution — Browser Playable First

This is the mandatory repository-level engineering constitution.

## 0. Highest principle: Browser Playable First

If this project is currently playable in a browser, or has a browser/WebGL target, that capability is a protected product requirement.

Before any create/edit/delete/move/rename:
1. Read and apply this skill.
2. Preserve browser playability unless the user explicitly authorizes breaking or removing it.
3. Do not introduce a dependency, API, engine feature, asset format, build requirement, or hosting requirement that silently makes the browser version stop working.
4. When a requested feature conflicts with browser compatibility, prefer a browser-compatible implementation or fallback. If no reasonable compatible path exists, explain the tradeoff before treating browser support as expendable.
5. System/platform policies and the user's explicit current request take precedence over repository policy.

Do not bypass, weaken, delete, rename, or replace this constitution unless the user explicitly asks to change repository governance.

## 1. Detect the real engine/runtime first

Never assume Unity, Unreal, Godot, Three.js, Babylon.js, or any other engine.

Inspect repository evidence before editing.

Common markers:
- Web: `package.json`, HTML/CSS/JS/TS, `src/`, Vite/Webpack, Three.js, Babylon.js, Phaser, PixiJS, PlayCanvas, WebGL/WebGPU.
- Unity: `Assets/`, `Packages/manifest.json`, `ProjectSettings/ProjectVersion.txt`.
- Godot: `project.godot`.
- Unreal: `*.uproject`, `Config/`, `Content/`, `Source/`.

Follow the stack that actually exists. Do not create Unity/Unreal/Godot structure just because this is a game project.

## 2. Preserve the current playable/deployment path

The current working runtime is the default source of truth.

If browser playable:
- keep direct browser playability;
- preserve the existing build/bundler/static-hosting path;
- preserve GitHub Pages or equivalent static deployment compatibility when currently used;
- avoid local-machine-only paths and services;
- preserve asset loading from deployed URLs.

Do not migrate engines/frameworks merely because another engine is more powerful.

If an engine migration is explicitly requested, keep the existing playable path available until the replacement browser/WebGL build is verified.

## 3. Inspect before changing

Read only relevant files, including when present:
- `README*`, `CONTRIBUTING*`, agent instructions;
- package/build manifests;
- relevant source/assets/tests;
- CI and deployment workflows.

Determine:
- runtime/engine/version;
- dependencies;
- architecture and naming;
- test/build/deploy commands;
- gameplay systems affected.

Do not guess versions/APIs when repository evidence exists.

## 4. Minimal coherent changes

Search for analogous code first.

Prefer extending existing systems and preserving:
- controls;
- save/progression formats;
- physics feel;
- public interfaces;
- deployment behavior.

Avoid unrelated refactors, unnecessary frameworks, duplicate managers, and broad rewrites.

## 5. Gameplay and real-time safety

Before gameplay changes, identify current behavior and ownership of state/timing.

Preserve unaffected mechanics. Fix root causes rather than hiding symptoms.

In real-time loops:
- avoid unnecessary allocation;
- cache stable lookups;
- avoid accidental O(n²) work;
- avoid rebuilding static geometry/UI every frame;
- avoid excessive production logging.

## 6. Browser/Web rules

For browser games:
- respect the existing JS/TS/module conventions;
- keep the current bundler unless migration is requested;
- preserve keyboard/gamepad/touch support when present;
- respect `requestAnimationFrame`, fixed-step simulation, or the existing game loop;
- do not silently require WebGPU, SharedArrayBuffer, cross-origin isolation, browser extensions, native binaries, or special hosting;
- when adding optional modern browser features, provide graceful fallback when practical.

For WebGL/WebGPU/Three.js/Babylon.js/PlayCanvas:
- reuse existing renderer/scene/camera/loader patterns;
- avoid per-frame creation of meshes/materials/textures;
- dispose replaced GPU resources;
- preserve coordinate and unit conventions;
- preserve asset URLs and loading behavior.

For web physics:
- keep the existing physics library/timestep;
- preserve 2D vs 3D conventions;
- do not mix transform-driven and physics-driven ownership without understanding the current design.

## 7. Unity rules — WebGL is a protected target

Activate only when Unity markers exist.

Inspect Unity version, packages, relevant asmdefs, assets, and tests.

Protect serialization:
- never casually change `.meta` GUIDs or serialized file IDs;
- move assets with their `.meta`;
- preserve Inspector data on serialized-field renames;
- do not hand-author large Scene/Prefab YAML graphs without strong evidence.

For Browser Playable First:
- treat Unity WebGL/Web as a release target;
- avoid native desktop-only DLLs/plugins unless a browser fallback exists;
- avoid assumptions about unrestricted local filesystem access;
- avoid platform-only APIs without conditional/fallback behavior;
- consider browser memory, download size, shader compatibility, audio/input limitations, and performance;
- do not introduce a package until WebGL/browser compatibility is established from project evidence or authoritative documentation;
- do not claim WebGL build success unless it actually ran.

Follow the project's existing Input System, render pipeline, physics dimension, UI system, and package conventions. Do not migrate them unless explicitly requested.

## 8. Other engines

Godot: preserve version, node/resource/signal structure and web-export compatibility when browser delivery is required.

Unreal: preserve modules, Blueprint/C++ interfaces and asset references; when browser delivery is a requirement, do not assume Unreal is an appropriate web target without explicitly resolving the delivery strategy.

## 9. Assets, security, and repository hygiene

Do not break asset paths or references. Search references before moving/renaming assets.

Preserve licenses/notices. Never commit credentials, API keys, signing secrets, machine-specific paths, IDE caches, or generated engine caches unless intentionally tracked.

For Unity, do not commit `Library/`, `Temp/`, `Logs/`, or `obj/`.

## 10. Validation

Before finishing:
1. inspect changed files and final diff;
2. run relevant tests/lint/build checks available in the repo;
3. run `git diff --check` when possible;
4. verify no unrelated files changed;
5. verify deployment/browser entry points still make sense.

Never claim runtime/browser/engine validation unless it actually ran.

Clearly distinguish:
- static/repository validation performed;
- browser smoke test still needed;
- Unity Editor/PlayMode/WebGL build or other engine validation still needed.

## 11. Required workflow

For features:
1. detect runtime/engine;
2. identify browser/deployment constraints;
3. read relevant architecture and analogous implementation;
4. change the minimum files;
5. update tests where practical;
6. check references;
7. review diff;
8. run available validation;
9. report changes, files, validation, and remaining runtime checks.

For bugs:
1. trace the failing path from repository evidence;
2. find the smallest plausible root cause;
3. check timing/state ownership/call sites/references;
4. fix the root cause;
5. add regression coverage where practical;
6. validate honestly.

## Preferred outcome

The best change improves the requested behavior while keeping the game directly playable through its existing browser path. Engine choice is secondary; browser delivery is the protected product constraint unless the user explicitly changes that requirement.
