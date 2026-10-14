# V58 Taipei evolution — development preview

Track: Legacy Stable repair/presentation and shared route-data bridge. This work
responds to the explicit request to improve the existing 3D game from its 2D
reference. The canonical playable main build remains the rollback version.
No Unity project, Unity compilation or Unity WebGL cutover is claimed.

## What was missing

V57 sent road curvature, hills, corridors and traffic to WebGL, but did not send
the existing 2D `stageLandmarkPlan`. Consequently 15 distinct routes shared generic
buildings/trees. V58 passes the original landmark names, sequence, segment anchors,
side, height and expressway ground drop into the renderer. The 27 landmarks have
original, simplified solid low-poly models, rather than billboard screenshots.
This is landmark coverage, not a claim of a surveyed or photorealistic Taipei.

| Route | 3D landmark interpretations |
| --- | --- |
| 1A | 景福門、總統府、自由廣場牌樓 |
| 2A | 圓山大飯店、劍潭山林古道 |
| 2B | 光華商場與三創 |
| 3A | 關渡大橋、北投地熱谷 |
| 3B | 美麗華摩天輪、故宮 |
| 3C | 臺北大巨蛋、松山文創煙囪 |
| 4A | 紅毛城、淡水渡船頭 |
| 4B | 小油坑、擎天崗石亭 |
| 4C | 饒河牌樓、內湖企業群、彩虹橋水岸 |
| 4D | 四四南村、信義玻璃建築群 |
| 5A | 漁人碼頭情人橋 |
| 5B | 富貴角燈塔 |
| 5C | 九份阿妹茶樓 |
| 5D | 台北101 |
| 5E | 貓空纜車、茶園木棧平台 |

## Driving and scenery

- Continuous 8% stick dead zone: fine input starts at zero; endpoints remain full
  lock. D-pad steering and connected controllers beyond slots 0/1 are supported.
- Keyboard/touch physics, drift, nitro, score rules and route graph are preserved.
  Existing physics source fingerprint checks and deterministic replay remain gates.
- Corner advice starts from the actual player collision position, matching 3D.
- Lane dash cadence is anchored to the absolute road segment, restoring motion.
- Route palettes come from the 2D art tables. Coastal water remains on the left,
  high-road terrain lies below the deck, slopes gain terrain and guardrails.
- Roadside trees/buildings no longer occupy coastal water or expressway air.
- Original start, checkpoint, 500/300/100 m and finish markers, plus the authored
  fork destinations, become 3D gantries. These do not create extra collisions.
- Landmarks stand beyond the full fork envelope. The gondola is an off-road
  visual landmark, not a new drivable connection. Nearby generic props are cleared.
- Landmark parts merge into one vertex-colored mesh per landmark. Only the current
  route's models are resident; changing route releases them. Environment uses fixed
  geometry/instance buffers; LOW quality omits extra hill meshes, keeps landmarks.

## Validation and limits

`npm test` includes authored route/collision checks, source-locked handling replays,
all 27 landmark volume/data mappings, broad-fork clearance, geometry reuse/disposal,
and stick calibration/disconnection checks. GPU-mocked geometry tests do not prove
appearance, frame rate, or playability.

`npm run test:taipei-browser` uses real Chromium WebGL and captures every landmark
in sunset/night, branch approaches, and mobile viewports. The test-only scene
bridge never ships. Screenshot byte counts are runtime smoke checks, not visual
approval. Review the images before promotion.

This is a development preview, not a completed esports release. Online authoritative
race simulation, anti-cheat, ranked matchmaking, latency compensation, competition
operations and measured device performance remain separate engineering work. Local
records must not be represented as verified online rankings. Large future systems
should follow the repository's parallel Unity Primary migration constitution.

## Landmark visibility / asphalt repair

The first screenshot review found that an 18-segment anchor exclusion left tall
foreground facades and trees blocking landmarks farther down the road. The
renderer now shares an absolute, side-specific approach window with the terrain
renderer. Generic facades, signs, trees and decorative hill meshes yield on that
side; road geometry, opposite frontage and collision rules remain unchanged.

The road now uses a deterministic charcoal sRGB aggregate texture with mipmaps,
zero metalness, and absolute-segment UVs, reducing the pale road and preventing
the grain from sliding with the player. Browser captures include a second, closer
sunset view of every landmark: 81 landmark views plus branch/mobile captures.
