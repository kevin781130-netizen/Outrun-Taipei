# Browser-First Game Development Constitution for Codex

Before ANY repository mutation — create, edit, delete, move, or rename — Codex MUST read and apply:

`.agents/skills/game-development/SKILL.md`

## Highest repository principle

**Browser Playable First.** If the project is currently browser playable or targets Web/WebGL, no change may silently break browser playability, deployment, or hosting compatibility.

Codex must:
- detect the real engine/runtime before editing;
- preserve the current playable/deployment path;
- treat Unity WebGL/browser compatibility as a protected target if Unity is ever introduced;
- use browser-compatible alternatives/fallbacks when practical;
- never force an engine migration unless explicitly requested;
- follow the skill's validation and handoff rules.

Do not bypass, weaken, delete, rename, or replace this constitution unless the user explicitly asks to change repository governance.

System/platform policies and the user's explicit current request take precedence.
