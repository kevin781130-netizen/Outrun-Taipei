# V85 — Paint reflections and day/night light balance

The sculpted V83/V84 player paint had no environment map. Metallic/clearcoat
surfaces therefore lacked broad reflection content, making creases harder to read.
The old key-light intensity also stayed the same in night mode.

## Change

`EnvironmentLighting.cjs` authors two deterministic 256×128 RGBA panoramas in
linear radiance: sunset and night. A warm horizon, cooler upper sky, broad key/fill
regions and skyline interruptions supply reflection contrast. These are approximate
static artistic environments, not live reflections of passing buildings or traffic.
There are no HDRI downloads, cube cameras or gameplay random draws.

Full3DScene assigns the appropriate panorama to `scene.environment` in STANDARD
and above. LOW uses null. Both source texture identities persist across switches;
no pixels are regenerated or marked dirty on each frame. Paint/glass get bounded
reflection intensity. The hemisphere and directional key use separate sunset/night
colors and intensities, with a weaker moon-colored key at night.

This uses the pinned Three.js r149 pipeline. Reviewed primary source:
[WebGLCubeUVMaps.js](https://github.com/mrdoob/three.js/blob/r149/src/renderers/webgl/WebGLCubeUVMaps.js),
blob `f7c7bc3cd710d55872343df2cee842af3b579ea9`. It accepts equirectangular mapping,
creates a PMREM on first use, caches by source texture and releases the filtered
render target on the source texture's dispose event. The new code owns and disposes
both source panoramas, clears scene.environment, then disposes the renderer.

## Budget and limits

The two CPU pixel arrays total 262,144 bytes (256 KiB). GPU source textures,
PMREM targets/shaders and first-use filtering overhead are additional and are not
included in that number. First use of each mood can require GPU preprocessing.
There is no added recurring reflection capture pass, extra scene light, or network
asset request. LOW avoids assigning the environment but keeps the small CPU arrays.

The panoramas use unsigned 8-bit linear channels; they are not HDR imagery. Final
material appearance depends on the existing tone mapping and actual GPU pipeline.
The static sunset/night environments approximate the overall mood rather than
tracking each route's exact sky palette or moving scenery.

## Validation

- Real Three.js texture tests: deterministic data, linear encoding, mapping,
  bounded panorama seam, fixed pixel budget, distinct day/night luminance,
  repeated source-identity reuse and exactly-once disposal.
- Full scene with GPU renderer mocked: mood/quality transitions, material
  assignment, day/night key/fill changes, unchanged input snapshot and cleanup.
- Full npm test, with `DRIFT_BASELINE_INDEX` set to the V84 HTML: seven seeded
  108-frame physical replays must match V84 exactly. Rules remain 84.0 and the
  V84 model scale remains unchanged.

Cloud Chromium cannot create a WebGL context. The automated tests verify texture
data and integration, not rendered PBR pixels, shader compilation or FPS. The
public V85 preview needs a GPU-enabled player review for final visual acceptance.
