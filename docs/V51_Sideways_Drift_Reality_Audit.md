# V51 Sideways Drift & Taipei Reality Audit

## Scope

V51 combines five user-facing goals:

1. exaggerated whole-car sideways drift presentation;
2. nitro release and drift charging at the same time;
3. slower natural speed build after 100 km/h with a much stronger nitro surge;
4. roadside building / landmark art repair;
5. a 15-route Taipei / New Taipei reality audit.

The external racing reference remains black-box only. No source code, ROM/disc/archive data, extracted texture, sprite, tile, palette, font, audio, vehicle model, handling table, camera table or animation table is imported.

## Sideways drift

V51 separates **physics yaw** from **presentation yaw**.

- Physics continues to use the independently authored DRIFT51 state.
- `v51DriftVisualYaw()` combines the local drift angle and slip angle into a larger visual yaw.
- The visual yaw is capped at 66 degrees.
- The whole car gets a small rear-swing screen offset, wider side presentation, skewed shadow and longer tire trails.
- Collider geometry, road position and traffic collision remain unchanged.

This is an original presentation model, not a frame-by-frame animation copy.

## Nitro while charging

V51 explicitly allows two states at once:

- a stored nitro stock may be released while the vehicle is already drifting;
- the same drift continues generating charge while boost is active.

The boost state no longer discounts drift-charge rate. The HUD reports `BOOST … · CHARGE …%` so the player can see both systems running simultaneously.

## Speed build

Natural acceleration now uses `v51CruisePullFactor()`.

- up to 100 km/h: strong normal acceleration;
- above 100 km/h: progressively increasing aerodynamic / gearing soft wall;
- near 285 km/h: natural acceleration becomes deliberately slow.

Nitro is separate:

- immediate 28 km/h impulse;
- strong independent high-speed push;
- taper only close to the 325 km/h boost ceiling.

This makes ordinary speed feel accumulated over time and nitro feel like a genuine forward launch.

## Roadside building repair

V51 retires active calls to the older overlapping V47 and V48 near-foreground building passes.

The active near-road architecture path is now:

- V50 surface-aware placement;
- `clipNearRoad()`;
- water-side non-building props;
- capped near scale;
- anchors outside the projected road envelope.

Below elevated roads, building blocks are also road-clipped, reduced in scale and moved farther out from the deck envelope.

## Landmark visual audit

The following major landmarks were redrawn in V51 after checking public real-world silhouettes:

- Grand Hotel Taipei: dominant golden roof, red structural rhythm, cream wall mass and hillside footing;
- Guandu Bridge: broad red steel arch rhythm instead of multiple unrelated small arches;
- Taipei Dome: low oval metallic volume with horizontal bands rather than an oversized hemisphere;
- Fugui Cape Lighthouse: black-and-white tapered lighthouse with lantern gallery and low station building;
- Amei Teahouse: dark green facade, timber window rhythm and red lanterns;
- Maokong Gondola: white cabins, dark glazing, colored lower trim and cable towers;
- Taipei 101: clearer tiered volume with a darker side face.

All drawings are original Canvas geometry. No photographs or external binary art are packaged.

## Taipei / New Taipei route reality audit

Every route remains a game route, not GPS navigation. V51 classifies each node:

| Route | Reality class | Audit note |
|---|---|---|
| 1A | real-anchor | Ketagalan Boulevard, Presidential Office and Jingfu Gate are in the same civic core; distance is compressed. |
| 2A | real-corridor | Zhongshan North Road to Yuanshan / Jiantan; Grand Hotel is a hillside visual anchor. |
| 2B | real-corridor | Civic Boulevard elevated corridor and Guanghua district are geographically coherent; geometry is game-compressed. |
| 3A | compressed-link | Beitou Thermal Valley and Guandu waterfront are both in Beitou but are not one direct road. |
| 3B | compressed-link | Miramar / Dazhi and National Palace Museum are separate north-Taipei anchors compressed into one stage. |
| 3C | real-anchor | Taipei Dome and Songshan Cultural and Creative Park are adjacent. |
| 4A | real-corridor | Tamsui Old Street, Golden Riverside and Fort San Domingo belong to the Tamsui waterfront heritage belt. |
| 4B | compressed-link | Xiaoyoukeng and Qingtiangang are both Yangmingshan anchors but not one direct racing road. |
| 4C | compressed-link | Neihu Tech Park and Raohe sit on opposite sides of the Keelung River. Rainbow Bridge is visual-only and not a car road. |
| 4D | real-anchor | 44 South Village, Taipei 101 and Xinyi commercial core are in the same Xinyi area. |
| 5A | real-corridor | Fisherman's Wharf / Lover's Bridge are on the Tamsui side. Danjiang Bridge is a current real road bridge and is used mainly as a river-mouth landmark in this stage. |
| 5B | real-anchor | Fugui Cape Lighthouse marks Taiwan's northernmost cape / lighthouse area. |
| 5C | real-anchor | Jiufen and Amei Teahouse are real Ruifang / Jiufen anchors; drivable geometry is adapted. |
| 5D | real-anchor | Taipei 101 is a real Xinyi anchor; the finish street layout is fictionalized. |
| 5E | compressed-link | Maokong Gondola and tea areas are real Maokong anchors; the gondola is visual-only, not a drivable facility. |

## Clean-Room rules

V51 continues to enforce:

- no 1:1 syntax or control-flow translation;
- no decompilation / disassembly / opcode / symbol mapping;
- no exact handling / camera / animation table copying;
- no ROM / disc / archive / split-archive packaging;
- no extracted binary art or audio;
- no licensed vehicle identity;
- no copied distinctive route UI, branded mode or signature mechanic;
- no deliberate patented-mechanic replication from a source implementation.

## Merge gates

Before merge, V51 must pass:

- Clean-Room compliance;
- zero packaged ROM binary assets;
- zero forbidden runtime external marks;
- all 15 route identities and reality-audit entries;
- retired foreground-layer guard;
- exaggerated sideways visual-yaw regression;
- soft-wall speed curve regression;
- nitro impulse regression;
- simultaneous boost + drift-charge regression;
- real keyboard drift / boost / charge browser test;
- Twin Link;
- desktop / portrait / landscape browser smoke;
- visible `V51.0` build label.
