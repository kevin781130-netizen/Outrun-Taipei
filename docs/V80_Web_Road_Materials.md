# V80 — existing Three.js web game

The user explicitly ended the Unity-first direction on 2026-10-18. AGENTS.md,
CLAUDE.md and the two mirrored game-development constitution files were removed.
The unmerged Unity PR #56 is closed and preserved as historical work.

This branch extends the existing V79 web game. No Unity project is included.

## Art change

- Asphalt and paving each have a 128px repeating albedo, roughness and tangent
  normal texture, generated once when the scene is created.
- Color is sRGB; numerical texture channels remain linear. All six maps occupy
  384 KiB of CPU pixel data, about 512 KiB of GPU data including mipmaps.
- Road UVs stay anchored to absolute route segments. Every map repeats at the
  same approximate two-metre scale; no external texture downloads are needed.
- Urban roads receive narrow paved sidewalk ribbons outside the existing road
  edge. Forks, elevated expressways, coastal and mountain routes do not get them.
- Scene disposal releases all generated maps. Rendering, driving and collision
  remain separate; no new colliders, scoring changes or physics parameters.
- The generated browser bundle contains the new RoadSurface module. Existing
  deployment still needs only index.html, the renderer and pinned Three.js.

## Validation

Run `node tests/v80-road-surfaces.cjs`, `npm test` and
`node tools/build-hybrid.cjs --check`.

Unit tests and mocked-GPU geometry checks do not prove visual correctness.
Actual browser review must report whether WebGL initialized. No Unity install or
Windows build driver is required for this web branch.
