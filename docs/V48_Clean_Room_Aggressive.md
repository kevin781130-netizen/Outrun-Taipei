# V48 Clean-Room Aggressive Pass

## Goal

V48 intentionally pushes much further than V47 while preserving strict Clean-Room boundaries. The reference package remains a black-box observation source only. No source code, ROM/disc image, archive, split archive, texture, sprite, tile, palette, font, music, sound, vehicle model, shader, symbol table, disassembly, handling table or control-flow structure is imported.

V48 adopts only high-level, independently implementable racing principles:

- strong high-speed road presence;
- layered far/mid/near scene composition;
- rapid foreground occlusion;
- clear road-edge motion;
- noticeable load transfer under braking and steering;
- throttle-lift line tightening;
- assertive but recoverable drift;
- quick counter-steer and recenter behavior;
- speed-dependent camera presentation.

All code, constants, colors, geometry and tuning are independently authored for Taipei Sunset Drive.

## Absolute prohibitions

- No 1:1 syntax translation.
- No disassembly, opcode mapping, symbol mapping or function-to-function reconstruction.
- No exact handling curve or parameter table copying.
- No ROM / ISO / GD-ROM / CHD / BIN / split archive packaging.
- No extracted sprite, tile, palette, font, music, sound or vehicle model.
- No licensed vehicle identity.
- No distinctive route UI, branded mode, checkpoint combination, passenger presentation, special gear-drift recipe or signature audio naming.
- No replication of a patented mechanic from a source implementation.

## Taipei identity

V48 keeps the V46/V47 Taipei guard as source-of-truth:

- all 15 route IDs, names, themes and archetypes;
- Taipei / New Taipei landmarks;
- existing route graph;
- visible-only traffic collision;
- LOW/HIGH drivetrain;
- 325 km/h nitro;
- MOMENT BOOST;
- Twin Link foundation.

The art pass is generated from Taipei route archetypes and projected road geometry only.

## Handling changes

### More assertive steering

`v48SteeringProfile()` remains speed-dependent, but V48 raises both low-speed response and high-speed authority compared with V47. The car still has weight at 250+ km/h, but steering no longer feels overly damped.

### Stronger weight transfer

Throttle lift produces a larger front-grip increase. Braking adds a stronger, still bounded, steering-dependent rotation term. These values are original and do not duplicate any source handling table.

### DRIFT48

DRIFT48:

- lowers entry speed;
- shortens entry ramp;
- increases allowed body yaw and slip;
- increases drift path authority;
- strengthens counter-steer trim;
- increases recovery response.

The existing nitro charge and MOMENT BOOST systems remain unchanged.

### Chassis motion

Pure presentation state tracks:

- `chassisRoll`
- `chassisPitch`
- `visualLoad`

These react to steering, lateral velocity, throttle and braking, but do not alter collision geometry.

## Art changes

### V48 horizon compression

`drawV48HorizonDepth()` adds a stronger Taipei-generated horizon band and a second large-scale silhouette layer with slow parallax.

### Projected road shadows

`drawV48RoadShadowBands()` projects shadow bands over actual road corridors. Fork geometry and road width remain authoritative.

### Large foreground setpieces

`drawV48ForegroundSetpieces()` adds larger near-camera Taipei masses:

- urban facade / awning blocks;
- expressway pillars and sound-wall panels;
- waterfront railing and vegetation;
- mountain trees and foliage.

They are render-only and never become colliders.

### Peripheral rush

`drawV48PeripheralRush()` derives speed streaks from actual projected road edges instead of placing arbitrary full-screen lines.

### Camera presentation

The display pass combines:

- speed-dependent crop / FOV effect;
- steering and drift lean;
- road-curve lean;
- boost punch.

This remains presentation-only.

## Additional cleanup

V48 removes historical shipping-runtime identifiers tied to external titles or licensed vehicles, including old localStorage and audio naming residues. The Clean-Room compliance gate now rejects them.

## Validation requirements

Before merge, V48 must pass:

- Clean-Room compliance;
- all 15 Taipei route identity checks;
- all branch paths;
- V48 handling regressions;
- V48 art-state immutability checks;
- Twin Link checks;
- desktop, portrait and landscape browser smoke tests.
