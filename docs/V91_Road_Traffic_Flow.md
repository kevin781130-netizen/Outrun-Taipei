# V91 — Wider roads, staggered traffic, 12% reference drift correction

RoadFactor is scaled by 1.08. The same roadCorridors() values drive asphalt,
line markings, boundaries, shoulders, forks, scenery offsets and the 3D snapshot.
Player and AI collision widths are unchanged, so this adds actual usable room.
The renderer's existing world conversion remains 8 units per lateral coordinate;
new tests check real asphalt vertices as well as gameplay boundary resolution.

Traffic previously wandered across most of the roadway and had no neighbor
headway. V91 keeps each car near its generated lateral home (at most 0.025 times
roadFactor of gentle target wander), preserving car count, type and initial free
cruise speed. Initial placement is longitudinally staggered by at least 2,400
world units (12 road segments). This also separates the three start-grid cars.

A front-to-back movement pass regulates following speed with a 1.1-second closing
horizon, bounded acceleration/braking and a last-resort forward-motion ceiling.
It preserves the minimum gap without moving a car backwards. AI does not overtake
other AI in this pass, even across lateral lanes; this is an intentional simple
arcade spacing policy to prevent cars catching up into road-blocking groups.
It does not change the player's speed, steering or collision response. Traffic
array identity/order stays stable; the temporary sorted list cannot remap render
receipts to different cars.

Recycling is limited to cars more than 1,800 behind the player, and places them
at least 28,000 ahead, beyond the 125-segment 3D view. Candidate slots check all
other cars against the 2,400 gap. When no slot fits before the traffic-zone limit,
recycling is deferred; there is no shared end-of-zone clamp that piles cars up.
Near cars are never teleported to create space. Recycled positions reset swept
history and visible/candidate receipts as before. The crash path uses the same
spacing controller, with recycling disabled, and zero dt changes nothing.

The V90 requested-heading model is retained with its 6% maximum nose multiplier,
raw-intent release, wrong-side suppression, normal/counter/recovery behavior,
angles and linked transfers. The active V88 baseline multiplier changes from
1.04 to 1.057. Using the same V89 reference as the earlier +10% result, the
180 km/h / curve 1.2 / 0.8 input / 60 Hz replay at 300 ms measures inward speed
0.173879 -> 0.194778 (+12.02%). This is about +1.78% relative to V90's 0.191367,
not a universal 12% gain across every speed, phase and input. Body yaw, slip and
speed remain the same in the reference. Competitive rules/record namespace is 91.0.

Validation: 46 deterministic route/difficulty/mode layouts check the 8% road
scale, unchanged counts, repeatable placement, authored-zone eligibility and
initial headway. Nine 75-second traffic replays cover urban/highway/mountain
routes at 30/60/120 Hz, fast-player overtakes and recycling. They enforce headway,
bounded lateral movement, monotonic finite motion, unchanged counts, safe far
teleports and no multi-car collision-depth slice. Additional cases cover a full
spawn horizon, exact-fit free slot, fast follower/slow lead, zero dt and the real
update/crash integration paths. Three.js geometry tests verify the widened
asphalt. Existing collision, fork, close-pass, transfer and drift suites remain
active. Full source audit/record expectations are updated for the intentional
road, traffic and small drift change. Actual GPU appearance/FPS and subjective
traffic difficulty still require player review.
