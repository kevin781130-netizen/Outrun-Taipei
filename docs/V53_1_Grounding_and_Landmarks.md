# V53.1 Visual Grounding and Landmark Quality

TAIPEI MUST LOOK BUILT, NOT DECORATED. No gameplay, speed, drift, nitro, scoring or timing change. `COMPETITION.version` stays `53.0`; visible build is V53.1.

## A. Road object grounding

### Root cause (OBSERVED + code)

- `drawApproachSign` placed the board **centre** at `p.x + p.w * (env + 0.34)` but the board is `0.62 * p.w` wide, so its inner edge sat at `env + 0.03`: on the kerb (kerb ends at 1.085) and inside the soft shoulder (the player may drive to about 1.12). Only the post was "outside the road", not the board.
- The formula knew nothing about the surface: on elevated decks (2B, 4C) the deck ends at about 1.08, so the sign hung in the void beside the deck; on the water side (3A, 4A, 5A, 5B) it stood in water.
- The same copy-pasted offsets existed in other places (`+0.14`, `+0.34`, `+0.55`, `+0.62`), so props were wrong in different ways: V46 edge props were placed per corridor, which put them inside the other road in the middle of a narrow fork; V50 roadside plates on expressways and bank rails on water were planted beyond the deck lip or in open water; the start board was a screen-space panel floating over the road; the civic gantry posts stood inside the barrier.

### Architecture

One geometric source, `roadsideAnchor()`, built on `roadCorridors()` (fork, transition and split corridors), `districtSurface()`, `deckElevation()` and the projected segment (`seg.p1.screen`). Placement is expressed in normalised road units (1.0 = corridor half width; screen x = `p.x + p.w * n`):

```
DRIVABLE EDGE (outermost corridor on that side) -> SHOULDER 0.12 -> SAFETY GAP -> OBJECT BODY (half width = inner)
```

- `roadsideOffsetN(index, side, {inner, foot, gapN, mode, bank})` is the pure lateral rule. Modes: `ground` (land only), `deck` (only on an elevated road: footing between the rail and the deck lip, so only slim objects), `bank` (water side: on the shore strip between shoulder and waterline, never in water), `auto` picks by surface.
- `roadsideAnchor()` returns `{x, y, groundY, w, scale, offN, edgeN, innerX, outerX, mode, surface, finite}` or `{ok:false, reason}` (`water`, `elevated-void`, `deck-too-wide`, `bank-too-narrow`, `offscreen`). `groundY` is the projected surface y of the same segment.
- `roadsideMedianAnchor()` places a median object only if the gap between two split corridors can hold both shoulders and the object.
- `roadsideGatePostN()` gives gate and gantry posts (beyond outer edge + shoulder).
- `drawOverheadGantry(L, R, lines)` is the shared overhead structure (deck rails on elevated roads, outer shoulders on the ground).
- Drawing and placement are separated: `placeApproachSign()` decides, `drawApproachSign()` only draws.
- `DEBUG_ROADSIDE_ANCHORS` (off by default, dev only) draws corridor edges (green), shoulder edge (yellow), anchor cross, object bounds and groundY for every anchor created that frame.

### Objects moved to the shared anchors

| Object | Before | After |
|---|---|---|
| V52 approach boards | centre at env + 0.34, board over the kerb, in void on decks, in water on the water side | ground board on the first free outer shoulder with the whole board clear of the road; overhead gantry on elevated decks; skipped if nothing valid |
| V52 road-edge furniture (15 styles) | per corridor at half + 0.14, so inside the other road in a narrow fork | outer shoulders, shore strip on water, deck lip on elevated, one median prop only when wide enough; per-style body widths |
| V53 utility poles | env + 0.62, no fork or elevation rule | outer shoulder + 0.40, one consistent side (land side on coastal routes) |
| V53 retaining walls | env + 0.34 | shared lateral offset; skipped where invalid |
| V50 roadside plates | planted beside elevated decks; open-water props at env + 0.55 | nothing beside elevated decks; water side uses a lamp and short rail on the shore strip |
| District props (sound barrier, signs) | drawn at deck level beyond the deck lip | skipped on elevated surfaces (deck rails already draw the barrier) |
| Checkpoint gate, route gantry | posts at 1.12 | posts at edge + shoulder + 0.02 via `roadsideGatePostN` (including the fork outer edge) |
| Start board | screen-space panel floating over the road | real overhead START gantry standing on the shoulders |
| Civic gantry (expressway) | posts inside the barrier | on the deck rails; never stacked with an approach gantry |

### Floating cases fixed

- Boards beyond a deck lip, V50 plates beside elevated decks, district props on elevated surfaces.
- Open-water pier, rail and bush on 3A, 4A, 5A, 5B (now a bank lamp and rail on the shore strip).
- Start board in mid-air; two gantries stacked on top of each other on 2B and 4C.

### Regression (new)

For all 15 routes x straight, shallow, medium, tight, fork, transition (fork and transition only where the stage has them): four object kinds (wide board, edge prop, pole, deck mount) on both sides must be finite, have `groundY` equal to the projected segment y, keep their whole body outside every corridor (kerb included on the ground, raw corridor on decks), never be ground-mounted on water or an elevated surface, and always be deck-mountable on a deck. Plus: approach boards for 15 routes x 3 modes resolve to a clear ground board or a deck gantry, gate and gantry posts clear the shoulder, every anchor created while rendering is valid, the start gantry is a world object, and the debug overlay is off.

## B. Landmark quality

### Root causes (OBSERVED)

1. `planLandmarks` scaled every sprite of a route to **one** height (`V51_LANDMARK_AUDIT[id].height`), so a pedestrian bridge, a ferry pier and a chimney were blown up to the same 7,000+ units as a tower: icons the size of buildings. Landmarks now carry their own `height` (individual proportions; only Taipei 101 is super-tall).
2. Several drawings were icons: boxes with a glowing sign, an umbrella, a lone arc.
3. Every building stood on the same table-top slab (`arcadeFooting`). It is now a soft contact shadow, a thin paving edge and planting.

### Audit (score 1 to 5, higher better; fake risk 1 low to 5 high; V53.0 build, sprites at full size, sunset and night)

| Landmark | Silhouette | Proportion | Material | Grounding | Authenticity | Integration | Speed read | Fake risk | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 內湖科技園區企業總部 | 2 | 1 | 1 | 2 | 1 | 2 | 3 | **5** | **REDRAW** (blue box, cyan stripes, glowing 'NEIHU TECH PARK') |
| 麥帥一橋與彩虹橋 | 2 | 2 | 3 | 1 | 2 | 2 | 2 | 4 | **REDRAW** (lone red arc, no deck or river) |
| 淡水金色水岸渡船頭 | 1 | 1 | 2 | 2 | 2 | 1 | 2 | **5** | **REDRAW** (grey box with sign) |
| 松山文創園區古煙囪 | 3 | 2 | 2 | 2 | 2 | 2 | 3 | 4 | **REDRAW** (red block with text) |
| 貓空木柵茶園景觀木棧平台 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | **5** | **REDRAW** (giant umbrella on a sign box) |
| 劍潭山林古道 | 2 | 2 | 3 | 2 | 2 | 3 | 2 | 4 | **REDRAW** (one tree) |
| 淡水紅毛城 | 3 | 3 | 3 | 3 | 4 | 3 | 3 | 3 | keep (could use arcade windows later) |
| 信義四四南村 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 2 | keep |
| 信義玻璃建築群 | 3 | 4 | 4 | 3 | 3 | 4 | 4 | 2 | keep |
| 光華商場與三創 | 3 | 3 | 4 | 3 | 3 | 3 | 3 | 3 | keep |
| 北投地熱谷浴場 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 2 | keep |
| 擎天崗石亭 | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 2 | keep |
| 貓空高空纜車 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 2 | keep |
| 淡水情人橋、關渡大橋 | 5 | 4 | 4 | 4 | 5 | 4 | 5 | 1 | keep |
| 大直美麗華摩天輪、故宮 | 4 | 4 | 4 | 3 | 5 | 4 | 4 | 2 | keep |
| 大巨蛋 | 4 | 4 | 4 | 3 | 5 | 4 | 4 | 2 | keep |
| 圓山大飯店、總統府、景福門、自由廣場、饒河牌樓 | 5 | 4 | 4 | 3 | 5 | 4 | 5 | 1 | keep |
| 富貴角燈塔、九份阿妹茶樓、101 | 5 | 5 | 4 | 4 | 5 | 5 | 5 | 1 | keep |
| 小油坑 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 3 | keep |

(Scores are my reading of full-size sprites, not measurements.)

### New Neihu (visual language)

A **district**, not a building: a 12-storey glass curtain-wall tower with a setback, flanked by an 8-storey beige-stone block with ribbon windows and a 7-storey aluminium-louvre block, a glazed link, lobby canopies, rooftop plant, a wide paved sidewalk, hedge planting strip, six street trees, lamps, and one small low wayfinding plate (小字 內湖科技園區). Identity is massing, street width, facades and trees. Materials are concrete, stone, aluminium and muted glass with warm and cool interior windows at night. No company logo, no glow, no neon, no cyan.

### Other redraws

- **Rainbow Bridge / Keelung River**: river, concrete approach spans on piers, red steel tied arch with hangers, railings, embankment steps and trees.
- **Songshan Cultural and Creative Park**: long modernist factory with ribbon windows, entrance and stairs, tapering brick chimney with pale bands, trees.
- **Tamsui ferry quay**: promenade and seawall, timber pier on piles, waiting shed, a docked passenger ferry, bollards, lamps, tree line.
- **Maokong tea hillside**: terraced plantation rows, timber deck on posts, hip-roofed tea house, small signboard.
- **Jiantan trail head**: stone steps between camphor and pine, handrail, stone lantern.

### Scale

Per-landmark `height` (world units): 101 is 19,000; Grand Hotel 7,600; Miramar 7,000; lighthouse 7,200; most others 3,000 to 6,400; low or wide objects (ferry quay 2,600, trail 3,600, bridge 4,200) are no longer inflated. Regression: at 50 or more segments away no landmark covers more than 60% of the screen width or 86% of the height, the base sits on the ground line, the sprite stays out of the drivable road, and every route has distinct heights.

## Before / After (screenshots, same route, playerZ, viewport, time of day)

Captured with `tests/tools/qa-grounding.cjs` (signs, gantries, start, fork, debug overlay) and `tests/tools/landmark-sheet.cjs` (every landmark sprite). Reviewed full size. Not committed.

## Performance

Landmark sprites are cached (`landmarkSpriteCache`); the new district is drawn once per route and mood. Anchors are a few arithmetic operations per object per frame. Best-of-3 render time (software canvas) 1A 23.9 to 24.1, 2B 28.0 to 28.7, 3A 24.4 to 22.7, 4B 16.9 to 14.5, 4D 17.7 to 15.3, 5C 23.6 to 24.8, 5D 13.8 to 14.8 ms: no measurable change.

## Not changed / remaining

- Gameplay constants, `V52_CORNER`, speed curve, close pass, scoring and time budgets are untouched.
- Taipei 101, Grand Hotel, Presidential Office, Guandu Bridge, lighthouse were kept as they are; only their base and scale logic changed.
- Candidates for later: Fort San Domingo (flat), the 4C Raohe arch scale next to the new Neihu, water reflections for the new bridge and quay.
