# Taipei Sunset Drive — Unity Retro Art Study v0.1

**Track: Unity Primary.** This is a parallel playable art-validation implementation, not a verified production port. Legacy Stable remains `../index.html`.

## Open and run

1. Install Unity **6000.0.62f1** with **Web Build Support** through Unity Hub. This is an explicit reproducible baseline, not a claim that it is the newest release.
2. Open this `unity/` folder. Let Unity resolve the pinned test-framework and engine-module packages.
3. Run **Taipei > Create Art Preview**. It creates the scene and profile through Unity's Editor APIs. Large scene YAML is deliberately not hand-written. Commit the generated scene, profile, settings and their `.meta` files after Editor verification.
4. Press Play. **T** cycles all fifteen reference routes; **M** switches sunset/neon; **R** retries; **P / Escape** pauses.
5. Run **Window > General > Test Runner > EditMode > Run All**.
6. Run **Taipei > Build Web Art Preview**. Serve `Builds/WebArtPreview/` over HTTP; do not open Unity's generated `index.html` through `file://`.

Generation opens an existing scene without regenerating it, preserving Inspector edits. Configuration can be reapplied explicitly through **Taipei > Apply Retro Web Settings**. If a previously opened scene has unsaved changes, save it before building. The generated output is separate from the root production entry point.

## Controls

| Action | Keyboard | On-screen |
| --- | --- | --- |
| Throttle / brake | W / Up; S / Down | GAS / BRAKE |
| Steering | Left / Right; J / L | LEFT / RIGHT |
| Drift | Shift + steering on a bend, above 58 km/h | DRIFT + steering |
| Nitro | N; above 60 km/h; 2.8 seconds | NITRO |
| Forward / reverse | A / Z | D / R |
| Manual LOW / HIGH | Space / E | SHIFT |
| Pause / retry / route / mood | P / R / T / M | Top toolbar |

Choose AT/MT during countdown; default AT. Touch input samples all active touches independently. Native HUD text stays outside the low-resolution world image. Portrait uses a letterboxed world with controls below it; landscape is the preferred driving layout.

## Art settings and rationale

| Setting | Default | Purpose |
| --- | --- | --- |
| Renderer | Built-in, custom vertex-colour shader | Small portable art foundation; no heavyweight renderer dependencies |
| World framebuffer | 640 × 360; toggle 480 × 270 | Preserve arcade pixel rhythm |
| Sampling | Point; no MSAA, HDR or mipmaps for framebuffer | Crisp silhouettes |
| Colour bands | 24/channel with static ordered dithering | Restrained posterisation without time-varying grain |
| Scanline darkening | 0.035 | Subtle CRT cue; adjustable to zero |
| Lighting | Three directional bands, warm/cool material palette | Readable low-poly forms |
| Distance haze | Linear 60–340 m | Clear foreground and layered skyline |
| Camera | 54° FOV, damped position, zero roll/shake | Comfortable road reading |
| Simulation | 60 Hz; 0.1 s maximum accumulated frame time | Stable controls, bounded catch-up after stalls |
| Web memory | 128 MB initial / 512 MB maximum | Starting budget to profile on real devices |
| Web compression | Gzip with decompression fallback | Static-host-friendly test builds |

Edit `RetroArt.asset` after generation. These are authored settings, not measured performance results. There is no claim of 60 FPS, mobile memory use or Web compatibility until profiling/build tests run.

Scenery uses one vertex-coloured mesh per route and a shared material, with reused meshes for the roadster, taxis/cars and coaches. Art avoids MeshColliders; swept road-space traffic tests use physical extents independent of sideways body yaw. Art objects remain outside the roadway. Coastal left-side scenery is water; elevated roads have rails and ground below. Each route gets an independent landmark silhouette study; these are deliberately stylised, not surveyed reconstructions.

## Migration status

| System | Unity study | Legacy Stable |
| --- | --- | --- |
| Fifteen route identities / curve keys / lengths / budgets | Imported reference JSON and deterministic procedural road | Full existing implementation |
| Vehicle, roadway, shops, landmarks, sunset/neon | Original low-poly art studies | Existing Canvas artwork |
| Gas, brake, AT/MT, reverse, drift charge, nitro | New fixed-step model with tests authored | Mature model, regression tested |
| Traffic collision, crash recovery, countdown, timed finish | Art-test implementation | Existing visible-only gameplay model |
| Five-stage branch progression, full scoring/close-pass, fork transitions | **Not ported** | Present |
| Radio/FM sound, tuning/save migration, leaderboard, gamepad/gyro, network transport | **Not ported** | Existing behavior; Twin Link remains a local matchmaker specification |
| Pixel palette presenter / shaders / browser build | **Needs Unity / real-device verification** | Existing web entry point |

The new model shares key speed/nitro limits with legacy, but is **not physics parity**. Drift uses Shift-held bend assistance, crash recovery uses 118 km/h (the actual current legacy constant), and the study checkpoint grants a fixed 10 s. Its score is a simple per-tick art-test counter, not a competitive leaderboard. Do not compare study times/scores to existing records.

## Batch verification

Use your local Unity executable (example path varies by OS):

```sh
Unity -batchmode -projectPath /absolute/path/Outrun-Taipei/unity \
  -executeMethod Taipei.Editor.ArtPreviewSetup.CreatePreview -quit -logFile setup.log
Unity -batchmode -nographics -projectPath /absolute/path/Outrun-Taipei/unity \
  -runTests -testPlatform EditMode -testResults TestResults/editmode.xml -logFile tests.log
Unity -batchmode -projectPath /absolute/path/Outrun-Taipei/unity \
  -executeMethod Taipei.Editor.ArtPreviewSetup.BuildWeb -quit -logFile build.log
```

The first command generates settings/scene; the second is the actual C# EditMode gate. Root `node tests/unity-source.cjs` only validates reference data and `.meta` GUIDs. It **does not compile or execute C#**. A release requires clean Unity compilation, passing EditMode, PlayMode and Web browser verification, frame captures on all fifteen routes, touch/gamepad accessibility work, and the missing game systems above. Keep this branch in draft until those gates pass.

API references: [Unity 6000.0.62f1](https://unity.com/releases/editor/whats-new/6000.0.62f1), [Web PlayerSettings](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/PlayerSettings.WebGL.html), [QualitySettings](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/QualitySettings.html), [RenderTexture](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/RenderTexture.html), [Test Framework changelog](https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/changelog/CHANGELOG.html).
