# Taipei sunset art slice — Unity Primary

Parallel Unity source foundation, based on `feat/v79-position-binned-drive-analysis`.
Legacy browser entry, physics, scores and deployment workflow are unchanged.
This is a **60-second automatic camera art study**, not a port of the racing game.

## Prepare

### Windows build driver

In this branch's repository root, run a read-only environment check:

```powershell
.\Build_Unity_ArtSlice.cmd --check
```

The driver checks Python 3.10+, Node.js, Pillow, fontTools, the pinned Unity Hub
installation, its WebGL module, a local Traditional Chinese font and the Editor
project lock. It installs nothing and does not change licenses or deploy content.
Use `--editor "D:/custom/Unity.exe" --font "D:/fonts/CJK.ttf"` for custom paths.
Actual editor version and build-target support are checked inside Unity.

With prerequisites ready and a clean committed checkout, run the same command
without `--check` to export models, bake six CJK signs and build. Python dependencies
can be installed in your own Python environment with `python -m pip install Pillow
fontTools`. The driver uses the Python selected by the Windows `py -3` launcher,
falling back to `python` if that launcher is absent.

Every build gets a fresh `Builds/ArtSlice-<UTC timestamp>` directory. Full editor logs
are in `Builds/Logs`. A successful editor exit alone does not count: the driver also
requires a matching Unity receipt, source commit, editor version and nonempty
HTML/loader/framework/WASM/data files, then writes SHA-256 hashes to
`build-provenance.json`. Visual status remains `not-verified` until browser review.
It prints a localhost-only HTTP preview command after successful output validation.
It does not start a server or open a browser automatically.

### Manual authoring

From the repository root, with Node.js and Python 3.10+:

```sh
node tools/export-unity-streetfront.mjs
python tools/export-unity-models.py
python tools/export-unity-surfaces.py
```

Optional but required before judging finished signage: install Pillow and fontTools,
then bake signs using a legally usable Traditional Chinese font, for example a local
Microsoft JhengHei font on Windows (check its font usage terms for your distribution):

```sh
python tools/export-unity-signs.py --font C:/Windows/Fonts/msjh.ttc
```

The font file is not copied or redistributed. Missing glyphs are errors. Without
this step, the scene contains sign backboards and warns about missing lettering.

Open `unity/TaipeiDrive` in Unity **6000.0.65f1** with WebGL Build Support.
Use **Taipei Drive → Generate sunset art slice**, then Play.
The builder uses built-in Standard materials; this first slice does not add URP.
Generation replaces the open scene, so save other work first.
Generated assets are reproducible and ignored by git; do not edit them manually.

For a separate WebGL build, use **Taipei Drive → Build sunset slice for WebGL**,
or run the editor with `-batchmode -quit -projectPath <absolute unity/TaipeiDrive>
-buildTarget WebGL -executeMethod TaipeiDrive.Editor.StreetSliceBuilder.BuildWebGL
-logFile <log path>`.
Building requires all six sign textures, even though scene authoring permits missing
lettering. Output: a new timestamped directory under `Builds/`. Compression is
disabled for simple static hosting.
This does not publish or overwrite `GAME-TEST-LAB/outrun-taipei/`.

## What is implemented

- Reuse of three existing engine-independent Taipei facade plans: arcade canopy,
  awnings, balcony bars, outdoor AC, rain pipes and fictional shop signage.
- Offline conversion of four already checked-in Quaternius CC0 glTF modules.
  RH/LH conversion, winding, UV orientation, source normals, material groups and
  transparent/double-sided surfaces are handled explicitly.
- Textures and notices copied from the existing licensed source; no new downloads.
- glTF metallic/roughness textures repacked to Unity Standard metallic (R),
  smoothness (A), and explicit occlusion (G), imported as linear data. Texture factors
  are applied during conversion. Identical masks share a content-derived filename
  across models. An ORM filename alone does not enable ambient occlusion.
- Original deterministic 512px asphalt and paving albedo/normal/mask maps, with
  repeated metre-scale tiling instead of a single texture stretched over 800m.
  Ground textures are generated offline and contain no baked directional shadows.
- Near/far facade prefabs, LOD culling, shared instanced materials, metre-scale
  placement and a protected 16m carriageway, pavement, dashed lines, warm key light,
  distance fog, shadows and a stable 60-second reference camera.
- Mesh provenance manifest and deterministic GUIDs for authored Unity scripts.

## Limits and acceptance

No Unity Editor is available in the authoring environment. **C# compilation,
PlayMode, WebGL build, performance and visual acceptance have NOT been run.**
No new deployed visual URL exists. Existing canonical legacy URL remains:
https://kevin781130-netizen.github.io/GAME-TEST-LAB/outrun-taipei/

Source vertex colors and secondary UV streams are not imported.
Normal-map orientation and material appearance still need actual Unity verification.
Sky/environment reflections,
hero car, actual driving, collision and scoring migration remain future work.
The three building variants are a controlled art benchmark, not a complete city.

Before accepting art quality, build and deploy to a separate preview URL, confirm
the source commit, inspect street-facing facade orientation, texture UVs, signage,
near/far transitions and ground contact; measure draw calls, memory and frame time
on desktop and actual target phones. A generated scene is not visual verification.

## Validation

```sh
python -m unittest discover -s tests -p "test_unity_*.py" -v
node tests/quaternius-taipei-streetfront.cjs
git diff --check
```

Build-driver tests use synthetic files and subprocess stubs; they do not run Unity.

Third-party sources: `assets/third_party/quaternius-downtown/README.md` and
`QUATERNIUS_LICENSE.txt`. Unity runtime code belongs to the repository's Apache-2.0
license; imported Quaternius models remain CC0-1.0.

Material channel references:
https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#materials
https://docs.unity3d.com/Manual/StandardShaderMaterialParameterMetallic.html
