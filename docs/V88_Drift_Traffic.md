# V88 — Inward drift correction and traffic coachwork

V87 improved input response and linked direction changes, but did not raise the
sustained full-input lateral command. V88 multiplies the input-led, same-direction
active drift command by 1.08, including its existing entry ramp. Neutral input
remains zero. The opposite-direction countersteer branch and recovery branch keep
their previous authority. Grip steering, body yaw/slip targets, road curves,
centrifugal push, camera, collision widths and V87 transfer rules are unchanged.
Records use namespace 88.0 because actual lateral movement has changed.

At 180 km/h, right curve 1.2, 0.8 held input and 60 Hz, actual update-driven replay
at 300 ms changes road-relative inward lateral speed from 0.159720 to 0.173879
road units/s (about 8.86%; the outward road term is unchanged). Position changes
from 0.039626 to 0.043135. This is a measured simulation correction, not an
obstacle-avoidance success rate or a guarantee of player comfort.

Traffic now uses shared original tapered body and sloped glass geometry, painted
roof caps, round twelve-sided tyres, dark tail-lamp surrounds and rear plates.
The 15-car pool reuses three new geometries; each car has 11 meshes versus 8
previously (maximum 45 additional meshes/draw submissions when all are visible).
There are no new textures, downloads, lights or shadow maps. Materials and
geometry use the existing resource disposal path. No external model licences are
introduced. Paint updates affect the roof cap as well as the body.

Every traffic model retains the original local bounding box: X [-1,1],
Y [0.04,1.275], Z [-1.8,1.865]. The existing halfWidth scale and road transform
remain authoritative, preserving collision/visibility receipt sizing. The new
slopes remain inside that envelope; physical collision widths are unchanged.

Validation: 18 old/new actual-update replays cover both directions, 110/180/240
km/h and 30/60/120 Hz, a held correction, release and opposite correction.
They require a real inward speed increase, less than 0.008 extra road-unit
movement at 300 ms, bounded reference positions, identical body yaw/slip/speed,
and identical grip behavior. Existing V87 transfer/recovery tests remain active.
Real pinned Three.js geometry checks verify outward winding, the exact retained
model envelope, pooling, snapshot immutability and disposal exactly once.
A CPU diffuse before/after review inspected front/rear silhouettes and occlusion.
GPU rendering, frame rate, in-game material appearance and subjective avoidance
feel still require browser/player review; geometry tests mock only WebGLRenderer.
