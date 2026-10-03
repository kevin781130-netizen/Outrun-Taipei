# V47 Clean-Room 3D Arcade Feel

## Scope

V47 treats the user-provided reference package as a black-box reference only. The package is not unpacked into the repository and no ROM/ISO/archive content, vehicle model, texture, font, audio, shader, executable code, symbol table, disassembly, opcode map, or handling table is imported.

The implementation is based on independent observations of generic 3D arcade-racing behavior:

- stable, precise steering at high speed;
- stronger response at low and medium speed;
- throttle-lift weight transfer for tighter grip-line rotation;
- small brake-induced rotation before a corner;
- controlled drift angle with counter-steer trimming;
- quick drift recovery and clean S-bend transitions;
- broad horizon composition, mid-ground depth separation and fast foreground occlusion.

These are reimplemented with original code, original constants and the existing Taipei simulation.

## Absolute prohibitions

- **No 1:1 syntax or control-flow translation.**
  - No decompilation.
  - No disassembly.
  - No opcode/symbol/function mapping.
  - No reconstruction of exact handling curves or parameter tables.
- **No ROM binary asset packaging.**
  - ROM, ISO, GD-ROM images, split archives, ZIP/7z/RAR, sprite/tile/palette/font/audio dumps are forbidden.
  - The CI gate rejects common binary/archive extensions including split `.zNN` parts.
- **Avoid patented or signature features.**
  - No licensed vehicle identity.
  - No exact route UI or branded mode structure.
  - No named relationship/quest mode from the reference title.
  - No signature gear-shift drift recipe.
  - No exact checkpoint, HUD, route-stage naming, licensed car roster or passenger presentation.

## Taipei identity guard

V47 preserves the V46 route guard unchanged. The following remain source-of-truth:

- 15 Taipei/New Taipei route nodes;
- Taipei landmarks and signage;
- urban / expressway / coastal / mountain archetypes;
- visible-only traffic collisions;
- LOW/HIGH torque model;
- 325 km/h nitro and MOMENT BOOST;
- Twin Link foundations.

## Handling implementation

### Speed-dependent steering

`v47SteeringProfile()` reduces response and steering authority as speed rises. Keyboard steering therefore stops feeling like an instant full-lock switch at 250+ km/h while remaining responsive in low-speed corners.

### Lift grip

Releasing throttle on a grip corner increases front-end rotation without forcing a drift. This gives the player a second cornering tool besides full drift and makes medium bends more controllable.

### Brake rotation

A small steering-dependent rotation contribution is applied while braking before a corner. It is intentionally modest and does not reproduce any source title's exact brake-drift logic.

### Drift trim and recovery

`DRIFT47` uses a lower maximum body angle, lower slip target, faster yaw/slip response and faster recovery. Counter-steer trims the slide before ending it, while neutral steering recenters the car quickly enough for chained Taipei S-curves.

Nitro charge and MOMENT BOOST remain Taipei-specific systems.

## Art implementation

### Cinematic depth

`drawV47CinematicDepth()` adds:

- a restrained horizon haze band;
- large original Taipei urban/expressway/coastal/mountain masses;
- slow parallax on far shapes.

### Foreground framing

`drawV47ForegroundMass()` adds stage-family-specific foreground occluders:

- Taipei shopfront/canopy mass for urban stages;
- sound-wall/post mass for expressways;
- railing/vegetation for waterfronts;
- tree/foliage mass for mountain roads.

These are pure render objects and create no collider.

### Camera feel

`presentArcade()` now applies a very small speed-weighted visual lean derived from the player's own steering and drift angle. It does not alter world coordinates, collisions or road geometry.

## CI gates

`tests/clean-room-compliance.cjs` rejects:

- ROM/disc/archive/split-archive extensions;
- console-ROM signatures;
- external brand/vehicle references in shipping runtime;
- distinctive mode / route / gear-drift markers;
- direct-translation/disassembly markers.

V47 scenario regression additionally checks:

- independent Clean-Room provenance flags;
- high-speed steering stability;
- throttle-lift grip behavior;
- drift recovery constraints;
- V47 art layers cannot mutate gameplay state;
- all 15 Taipei routes remain intact.
