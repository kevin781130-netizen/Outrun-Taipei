# V89 — Street-facing windows and stepped roofs

Art-only follow-up to V88. The previous generic glazing slab lay along the
building's Z face (the direction of travel); the road-facing X wall remained
mostly masonry. It also presented a single uninterrupted dark slab.

New shared panels lie against the road-facing X wall in each building's own road
frame. They use an original deterministic 4-column/8-floor atlas with mullions,
frames, unlit blue glass and a sparse occupied-window emission mask. The shell
keeps the existing masonry pattern without oversized painted windows. Emission
is restrained in daylight (0.06) and increases at night (0.8; 0.35 in LOW).
Atlas mipmaps reduce distant detail shimmer. No downloaded textures or models.

Two shared instanced batches add narrow cornices and inset rooftop volumes.
These change the skyline without extending a building's X/Z footprint. Existing
street offsets, fork neighborhood scanning and landmark vista exclusions still
apply. Panels project only 0.045 world units toward the road, inside the prior
minimum 2-unit shoulder margin. Mountain/coastal/expressway behavior keeps the
existing archetype rules. LOW omits both new roof batches.

Budget: two 128x256 RGBA CPU maps total 256 KiB before GPU mipmaps (about 341 KiB
including a complete mip chain); two additional instanced draw batches, each
capped at 120 boxes. Window panels replace the existing batch. Maps/materials and
instance buffers are created once, reused across quality/mood/route changes,
and disposed through the existing scene lifecycle. No extra lights, shadow maps
or per-frame mesh creation.

Gameplay code is byte-identical to V88 after normalizing the visible build label;
a SHA-256 scope guard enforces this. Rules/records stay at 88.0. The +8% active
inward drift correction and linked transfers remain available.

Validation: deterministic maps and sparse emission; correct sRGB/linear channels;
real Three.js instance transforms proving street-facing panels and contained roof
footprints; LOW/urban/mountain/expressway switches; snapshot immutability; matrix,
texture and geometry reuse; exact-once texture disposal; unchanged gameplay hash.
Full npm test includes the existing fork, landmark, traffic and driving replays.
WebGLRenderer is mocked in geometry tests; GPU appearance, FPS and actual driving
feel require in-game/player review.
