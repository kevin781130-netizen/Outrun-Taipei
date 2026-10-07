---
name: unity-github
description: Mandatory repository-governance skill for safe game-project changes. Apply before any file mutation. Detect the actual project stack first; activate Unity-specific rules only when Unity markers exist. Preserve serialization, references, architecture, tests, and reviewable Git history.
---

# Repository Constitution — Safe Game / Unity Changes

This skill is the repository's mandatory change-governance layer.

## 0. Constitutional status

Before creating, editing, deleting, moving, or renaming any repository file:

1. Read and apply this skill.
2. Treat it as the highest-priority repository-level engineering policy.
3. Do not bypass, weaken, delete, or rewrite this policy unless the user explicitly asks to change the repository constitution.
4. Platform/system policies and the user's explicit current request still take precedence.
5. If a requested change conflicts with this repository policy, satisfy the user's intent with the safest compatible implementation and disclose the conflict.

Read-only inspection does not require a mutation, but any transition from analysis to writing must first pass through this skill.

## 1. Detect the real project type first

Never assume the repository is Unity just because this skill exists.

Before editing, inspect the smallest relevant set of files and determine the active stack.

Unity markers include:
- `ProjectSettings/ProjectVersion.txt`
- `Packages/manifest.json`
- `Assets/`

Web/JavaScript markers may include:
- `package.json`
- `src/`
- HTML/CSS/JS/TS entry points

Other engines or stacks must be detected from repository evidence.

If Unity markers are absent:
- do NOT invent Unity folders, packages, GUIDs, scenes, prefabs, or project settings unless the user explicitly requests a migration/conversion;
- apply the general safety, architecture, testing, Git, and validation rules in this skill;
- follow the repository's actual stack and conventions.

If Unity markers are present, also apply all Unity-specific sections below.

## 2. Inspect before changing

Before editing, read only what is relevant, including when present:
- `README*`
- `CONTRIBUTING*`
- root agent instructions
- package/build manifests
- relevant source files
- relevant tests
- CI workflows if validation/build behavior matters

For Unity projects also inspect:
- `ProjectSettings/ProjectVersion.txt`
- `Packages/manifest.json`
- `Packages/packages-lock.json`
- relevant `.asmdef` files
- relevant files under `Assets/`

Determine:
- project/runtime version
- package/dependency versions
- architecture and naming conventions
- test/build commands
- render pipeline/input system when relevant to Unity

Do not guess versions or APIs when the repository declares them.

## 3. Preserve existing architecture

Search before creating new abstractions.

Prefer extending established patterns over introducing parallel systems.

Avoid:
- unnecessary manager/singleton layers
- new frameworks when existing infrastructure can solve the task
- broad refactors unrelated to the request
- changing public APIs without checking call sites
- architecture migrations unless explicitly requested

Make the smallest coherent change that satisfies the user's intent.

## 4. Source-code quality

Follow repository style first.

If no clear convention exists:
- use descriptive names;
- keep responsibilities focused;
- avoid hidden global state;
- clean up event/listener subscriptions;
- avoid needless allocations in hot paths;
- cache expensive repeated lookups;
- keep editor/tooling code out of runtime paths when applicable;
- preserve backwards compatibility when practical.

Fix root causes rather than masking symptoms.

## 5. Unity C# rules

When the repo is Unity:
- prefer `[SerializeField] private` for Inspector-exposed mutable fields;
- respect Unity object lifetime and null semantics;
- use lifecycle methods intentionally;
- avoid repeated `GameObject.Find`, object searches, `GetComponent`, or LINQ in hot paths unless justified;
- keep Editor APIs in Editor assemblies/folders or behind `#if UNITY_EDITOR`;
- do not silently switch input systems, render pipelines, physics dimensions, or package families.

### Serialized field renames

Renaming serialized fields can lose Inspector data.

When appropriate, preserve compatibility with:

```csharp
using UnityEngine.Serialization;

[FormerlySerializedAs("oldFieldName")]
[SerializeField] private SomeType newFieldName;
```

Do not add `FormerlySerializedAs` if the old member was never serialized.

## 6. Unity lifecycle

Use lifecycle methods deliberately:
- `Awake`: internal setup and cached references
- `OnEnable` / `OnDisable`: event subscription lifecycle
- `Start`: setup requiring other objects to have completed `Awake`
- `Update`: frame-based input/logic
- `FixedUpdate`: physics-step logic
- `LateUpdate`: follow-up behavior such as camera tracking

Do not move behavior between lifecycle methods without checking consequences.

## 7. Unity serialization and asset safety

Unity YAML and `.meta` files are reference-sensitive.

For existing `.unity`, `.prefab`, `.asset`, `.mat`, `.controller`, and `.meta` files:
- never casually change GUIDs or file IDs;
- preserve object references;
- make narrow edits only when the serialized property is understood;
- do not reorder large YAML sections without a reason;
- move an asset together with its `.meta` file;
- never reuse another asset's GUID.

Without a Unity Editor, do not hand-author large complex Scene/Prefab graphs, AnimationControllers, Timeline assets, or imported-model metadata unless the user explicitly requests text-level authoring and the repository provides enough examples to do it safely.

Prefer source code, shaders, UXML/USS, asmdefs, JSON, and other well-understood text formats when Editor validation is unavailable.

## 8. Unity assemblies and packages

When editing `.asmdef`:
- preserve assembly names unless a rename is required;
- add only necessary references;
- avoid dependency cycles;
- keep runtime assemblies independent of Editor assemblies;
- respect platform include/exclude settings.

Before adding/upgrading a Unity package:
1. check whether it already exists;
2. check the project's declared Unity version;
3. follow the repository's existing package source convention;
4. do not invent versions;
5. avoid broad upgrades unless requested.

## 9. Unity subsystem rules

Detect before choosing APIs.

Input:
- follow the existing Input System / legacy Input Manager convention;
- do not migrate input architecture unless requested.

Physics:
- distinguish 2D from 3D;
- do not mix `Rigidbody2D` with 3D physics or `Rigidbody` with 2D physics;
- respect the existing movement pattern.

Rendering:
- detect Built-in / URP / HDRP;
- do not introduce pipeline-specific APIs into a different pipeline;
- do not assume Shader Graph is installed.

UI:
- detect UGUI / UI Toolkit / custom UI;
- avoid mixing UI systems unnecessarily;
- preserve serialized UI references.

## 10. Tests and validation

Use the repository's real validation tools.

Before finishing:
1. inspect changed files;
2. run relevant tests/lint/build checks that are actually available;
3. run `git diff --check` when possible;
4. inspect the final diff;
5. verify no unrelated files changed;
6. verify no secrets, caches, generated junk, or local machine paths were added.

Never claim a Unity compile, scene import, PlayMode test, or build succeeded unless it actually ran.

If no Unity Editor is available, explicitly separate:
- repository/static validation that was performed;
- Editor/PlayMode/build verification still required.

## 11. Git safety

Never commit generated/local Unity directories such as:
- `Library/`
- `Temp/`
- `Logs/`
- `obj/`

Also avoid:
- credentials/API keys/signing secrets;
- local IDE caches;
- accidental large generated artifacts.

Respect `.gitignore` and existing branch/PR conventions.

## 12. Large or risky changes

For migrations, dependency replacements, serialization changes, scene-wide refactors, or broad architecture work:
- map affected files first;
- make coherent, reviewable steps;
- preserve compatibility where practical;
- avoid opportunistic unrelated cleanup;
- identify remaining runtime/Editor verification.

## 13. Required workflow for feature work

1. Detect project stack and versions.
2. Read relevant architecture and analogous implementation.
3. Identify the minimum files that need change.
4. Implement narrowly.
5. Update/add tests when practical.
6. Search for stale symbols/broken references.
7. Review the diff.
8. Run available validation.
9. Report:
   - what changed;
   - key files changed;
   - validation actually run;
   - anything still requiring runtime/Unity Editor verification.

## 14. Required workflow for bug fixes

1. Trace the failing path from repository evidence.
2. Identify the smallest plausible root cause.
3. Check call sites and serialized/public usage before changing APIs or field names.
4. Fix the cause, not only the symptom.
5. Add a regression test when practical.
6. Review the diff and validate honestly.

## 15. Handoff / PR quality

A good handoff states:
- **Change:** behavior added/fixed
- **Files:** important files modified
- **Compatibility:** relevant version/dependency assumptions
- **Validation:** exact checks/tests run
- **Needs runtime/Editor verification:** only what truly remains

Do not overstate confidence or validation.

## Preferred outcome

A good change is small, idiomatic, reviewable, compatible with the repository's real stack, and honest about what was and was not validated.
