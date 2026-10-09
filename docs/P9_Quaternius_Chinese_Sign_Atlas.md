# P9 — Shared Traditional-Chinese sign atlas + idle-frame optimisation

**Scope:** preview-only shared art, on `art/quaternius-downtown-buildings-p1`.  
**Do not merge to main or deploy** until actual WebGL visual acceptance.

## What changed

1. **Shared sign atlas:** `sign-atlas-layout.mjs` specifies a single 1024×1024, power-of-two texture: seven horizontal slots and seven vertical slots, plus inset UVs to reduce texture bleeding. Each fictional shop retains its original, distinct Chinese name. The layout is pure engine-agnostic data.
2. **Improved typography:** `streetblock-signs.mjs` renders readable high-contrast Chinese lettering with a dark outline and width-dependent title sizing. The vertical label uses two Chinese characters; each shop's unique text is packed into an atlas slot. No downloaded font or logo is bundled; font glyphs depend on the testing machine, so the actual browser image **must be checked**.
3. **Merged signs:** previously the P8 preview created two meshes and two CanvasTextures per shop. P9 creates **one CanvasTexture and MeshBasicMaterial total**, and **one indexed eight-vertex mesh per shop** containing two quads (12 index values). One near-detail shop is *eligible* for one sign draw call instead of two, conditional on the browser renderer and scene visibility.
4. **Idle CPU work:** the preview uses OrbitControls `change` events and a dirty flag to recompute per-building LOD only after camera/control changes. Shared `Vector3` scratch avoids new allocation each check. WebGL draw-call/triangle **DOM display refresh is throttled to 250ms**, but the actual canvas stays on `requestAnimationFrame`.
5. **Expanded tests:** `tests/quaternius-sign-atlas.cjs` validates 14 atlas cells, bounds/UVs, Chinese shop names, generated geometry and a single shared texture/material using fake Canvas/Three implementations. The P8 Playwright audit also verifies that the preview reports the shared atlas correctly; the art-branch Windows QA runner executes the P9 unit test.

## Theoretical texture budget

Only uncompressed RGBA8 base mip level; ignores mipmaps, GL driver implementation, and original CC0 building textures.

| Shops / signs | P8 CanvasTextures | P8 theoretical bytes | P9 CanvasTextures | P9 base bytes |
| --- | ---: | ---: | ---: | ---: |
| 3 / 6 | 6 | 3,538,944 (~3.38 MiB) | 1 | 4,194,304 (4 MiB) |
| **5 / 10** | **10** | **5,898,240 (~5.63 MiB)** | **1** | **4,194,304 (4 MiB)** |
| 7 / 14 | 14 | 8,257,536 (~7.88 MiB) | 1 | 4,194,304 (4 MiB) |

The atlas is **not** more memory-efficient for the 3-shop option; the benefit is predictable single-texture/material reuse with fewer binds, better suited to the default 5-shop and optional 7-shop views. Mipmaps add memory in practice. Do **not** call this a measured VRAM/FPS saving.

The P9 change deliberately **does not alter geometry budgets** of the staged Quaternius facades (5 full-detail shops: 21,124 triangles, proxy 936). It changes the *representation* of the ten sign quads, not their shape or count.

## Local tests

```sh
git switch art/quaternius-downtown-buildings-p1
node tests/quaternius-streetblock.cjs
node tests/quaternius-sign-atlas.cjs
python3 -m http.server 8000
```

Preview: `http://localhost:8000/previews/quaternius-downtown/streetblock.html`.

Browser evidence command: `node tests/quaternius-streetblock-browser.cjs`; or the `tools/run-quaternius-qa.ps1` guarded runner on Windows. These browser tests are **not yet executed successfully within this assistant runtime**.

### Acceptance checklist

- Human-inspect all seven shop labels for Traditional Chinese glyph fidelity, sharpness and no bleeding at different camera angles and viewport sizes.
- Verify both signs share a texture and the combined geometry draws correctly in actual browser WebGL (not only unit tests).
- Verify camera orbit/zoom changes trigger per-building LOD updates; idle camera avoids unnecessary LOD churn; far and near states remain accurate.
- Compare actual draw calls, frame times, visual aliasing and GPU texture memory on desktop and phone hardware.
- Confirm no original game runtime changes, no direct Taipei map positions used, no deployment and no merge to `main`.

**P9 ends with art-only source/tests and a pending browser validation gate.**
