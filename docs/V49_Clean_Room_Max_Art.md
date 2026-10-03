# V49 Clean-Room Max Art Pass

## Objective

V49 intentionally pushes the visual and handling feel further than V48 while keeping a strict independent implementation boundary.

The reference package remains black-box only. V49 does not extract, import, translate or reconstruct source code, ROM/disc data, archives, sprites, tiles, palettes, fonts, music, sound effects, vehicle models, shaders, handling tables, camera tables, symbols, opcodes or control flow.

Only generic, externally observable racing principles are used:

- strong near/mid/far depth separation;
- dense roadside cadence;
- fast near-camera occlusion;
- road-edge motion and surface light rhythm;
- high-speed steering weight with meaningful authority;
- throttle-lift line tightening;
- brake-induced load transfer;
- recoverable power-slide behavior;
- speed-dependent camera presentation.

All implementation values and scene composition are independently authored for Taipei Sunset Drive.

## Absolute prohibitions

- No 1:1 syntax translation.
- No function-to-function or control-flow reconstruction.
- No decompilation, disassembly, symbol mapping, opcode mapping or source reconstruction.
- No exact handling, camera, stage or parameter table copying.
- No ROM, disc image, archive, split archive or disguised binary payload in the repository.
- No extracted sprite, texture, tile, palette, font, music, sound effect or vehicle model.
- No licensed vehicle identity.
- No source-title route UI, checkpoint composition, branded mode, passenger presentation or signature gear-drift recipe.
- No deliberate replication of a patented mechanic from a source implementation.

## Taipei identity lock

The existing 15-node Taipei route guard remains authoritative. V49 preserves:

- all route IDs, names, themes and archetypes;
- the route graph and branch paths;
- Taipei / New Taipei landmarks;
- visible-only traffic collision;
- LOW / HIGH drivetrain;
- 325 km/h nitro;
- MOMENT BOOST;
- Twin Link foundations.

V49 art is generated only from the existing Taipei stage identity, palette and projected road geometry.

## Handling changes

### DRIFT49

Compared with V48, V49 independently increases:

- steering response;
- high-speed steering authority;
- throttle-lift grip;
- brake rotation;
- turn-in bite;
- drift entry speed response;
- allowed body yaw and slip;
- counter-steer trim;
- recovery speed.

The top-speed and nitro rules remain Taipei Sunset Drive rules.

### Acceleration feel

Base acceleration is increased from 68 to 72 while keeping the same top-speed ceilings. This creates stronger perceived launch and corner-exit response without importing any reference handling table.

### Chassis load

Existing presentation-only chassis roll, pitch and load are increased. These values never modify road geometry or collision.

## Visual changes

### Taipei atmosphere layer

`drawV49TaipeiAtmosphere()` generates route-specific atmospheric cues:

- Beitou geothermal steam;
- Tamsui / waterfront haze;
- Xinyi / Neihu vertical city light accents;
- Yangmingshan / Maokong / mountain mist;
- civic warm horizon atmosphere.

These are original generated graphics, not extracted source assets.

### Road light rhythm

`drawV49RoadLightRhythm()` derives illuminated road-edge rhythm from the existing projected Taipei road corridors.

### Near occlusion

`drawV49NearOcclusion()` introduces larger near-camera Taipei silhouettes:

- shopfront / awning masses;
- elevated-road pillars and sound walls;
- waterfront rail / vegetation;
- mountain trees and foliage.

These objects are render-only and have no collider.

### Acceleration rush

`drawV49AccelerationRush()` begins earlier than V48 and derives streak geometry from projected road edges.

### Camera presentation

The display pass now combines:

- speed crop / FOV;
- steering lean;
- drift yaw;
- road-curve lean;
- chassis pitch;
- small lateral look-ahead.

It remains presentation-only.

## Visible test version

The game now displays a persistent build strip directly below the play controls:

`CURRENT TEST BUILD · V49.0 · CLEAN-ROOM MAX ART · TAIPEI`

Browser smoke tests verify that this strip is visible and reports V49.0 on desktop, phone portrait and phone landscape.

## Validation

V49 must pass before automatic merge:

- Clean-Room compliance;
- zero ROM binary assets;
- zero forbidden runtime external marks;
- 15 Taipei route identity checks;
- all branch paths;
- V49 handling regression;
- V49 art state-immutability regression;
- visible version-strip regression;
- Twin Link tests;
- Chromium desktop / portrait / landscape browser smoke.
