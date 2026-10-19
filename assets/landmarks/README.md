# Taipei landmark models — V95

28 independent **glTF 2.0 binary (.glb)** models, generated from the same original
geometry and material groups used by the game. Import these files into Blender,
Three.js or another glTF-capable editor. They contain geometry, normals, vertex
colors and six PBR material slots; no third-party photographs, textures or logos.
The repository's Apache-2.0 license applies to this original implementation.

Key models: `office.glb` (Presidential Office), `gate.glb` (Jingfu Gate),
`liberty.glb` (Liberty Square gate), `dome.glb` (Taipei Dome), `101.glb`,
`gondola.glb` (Maokong), `guandu.glb`, `rainbow.glb`, `lovers.glb`, and
`danjiang.glb`. `manifest.json` lists the complete catalog and sizes.

Rebuild with `node tools/export-taipei-landmarks.cjs`. Exports use indexed geometry
and deterministic quantization at 0.00001 model-local units. Runtime uses the
same source factory directly to avoid adding asset downloads to the race; each
route applies its authored scale, facing and clearance separately. For example,
river-crossing visual spans are stretched to the local river width. These are
recognizable original stylizations, not survey-grade or photogrammetry assets.
