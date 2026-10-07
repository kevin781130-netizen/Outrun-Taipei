# Unity-Primary Game Development Constitution for Codex

Before ANY repository mutation — create, edit, delete, move, or rename — Codex MUST read and apply:

`.agents/skills/game-development/SKILL.md`

## Highest repository principles

1. **Unity Primary:** From now on, new major game development should prefer Unity. The user does not need to repeat "use Unity" in each prompt.
2. **Browser Playable:** Unity WebGL/Web is a protected release target.
3. **Legacy Safe:** The existing playable game must remain intact as Legacy Stable during migration.
4. **Deployed Web Visual Truth:** For visual, UI, rendering, layout, camera, effects, animation, or interaction changes, the actual rendered deployed Web build is the authoritative acceptance surface. Source inspection alone is not visual verification.

Canonical visual verification URL:

https://kevin781130-netizen.github.io/GAME-TEST-LAB/outrun-taipei/

After a relevant build has been deployed, Codex MUST inspect the actual page with available browser/screenshot capability before claiming the visual result is verified. Unity Editor is useful but is not mandatory for visual acceptance when the corresponding deployed WebGL/Web build can be inspected.

If browser/screenshot inspection is unavailable, or if Codex cannot confirm that the deployed page corresponds to the change being reviewed, it MUST say so explicitly. It MUST NOT infer visual correctness from source code, HTML/YAML/CSS/C# inspection, tests, or build success alone.

Codex must never destructively replace the current game just to begin Unity development. Build/extend Unity in parallel, port incrementally, and keep the existing browser version working until a verified Unity WebGL cutover is explicitly intended by the user.

Do not weaken, delete, rename, or replace this constitution unless the user explicitly asks to change repository governance.

System/platform policies and the user's explicit current request take precedence.
