# V94 — Fine correction control and grounded street details

Small steering previously received the same whole-turn scale as a committed
swerve. V94 multiplies the complete requested turn by 0.85 up to |smoothed steer|
0.30, smoothly returning to 1.0 at 0.80. This affects grip and active same-side
drift correction. It also softens the initial ramp of a short digital key tap.
It is an input-amplitude curve, not a dead zone or a delay. Raw intent, steering
smoothing, body heading, slip and transfer timing are unchanged. Countersteer and
recovery bypass the new attenuation; full steering retains V93 lateral authority.

At 180 km/h on a 1.2 bend, after a half-second at 60 Hz:

| Steering input | V93 drift displacement | V94 displacement |
| --- | ---: | ---: |
| 0.20 | 0.057957 | 0.048102 |
| 0.50 | 0.161780 | 0.145302 |
| 0.80 | 0.264906 | 0.264906 |
| 1.00 | 0.333760 | 0.333760 |

The 15% applies to the requested turn term. Net displacement also includes the
unchanged outward road force and lateral smoothing, so net percentages vary.
Normal steering is intentionally softened at small input too. The V93 route/world
scale, camera, 270/300 caps, seven-second nitro and crash penalties are retained.
Records use a separate 94.0 namespace.

Art is original procedural data and geometry; there are no downloaded models,
new external requests, lights, shadow maps, or postprocessing passes. Asphalt
aggregate is less contrasty, larger-scale grain adds surface variation, paving
joints are less black, and normal strength is lower. Sunset light and fog are
warmer and less saturated. Existing scenic geometry and landmark clearances stay.

New pooled storefront and awning batches add a readable base to urban buildings:
glass, mullions, shelves, warm light strips, shop fascia and roller shutters.
Awnings project 0.60 world units into the existing minimum 2-unit building setback
and stay within the building frontage. They inherit V93 per-instance boundary
fading. Both batches are disabled in LOW, and absent on mountain/coastal/expressway
routes. Existing Chinese shop signs remain.

The player contact shadow uses a radial alpha texture instead of a hard ellipse.
Four pooled tyre patches follow the actual posed wheel centers, sharing that
texture and material, and are disabled in LOW. Three new detail textures total
80 KiB of CPU RGBA data before GPU copies/mipmaps. They are cached at startup and
disposed once. HIGH adds three instanced batches; no per-frame mesh creation.

Validation includes 96 actual-update old/new steering comparisons, eight 50 ms
keyboard taps, mirrored 30/60/120 Hz, exact pose/speed preservation, exact strong
steering equivalence, and counter/recovery bypass checks. Art checks cover texture
determinism/encoding/memory, shadow alpha falloff, actual wheel-to-patch alignment,
awning setback, route/LOW gates, caching/disposal and shader/bundle consistency.
Source fingerprints and the reviewed gameplay SHA audit are deliberately updated.
Historical tuning suites retain their explicit isolation fixtures. V84 additionally
fixes the new fine-input gain to 1 in its frozen V82/V84 grip comparison, because
normal small steering is intentionally changed in V94; live normal steering is
checked by the new old/new V94 replay suite.

GPU appearance, performance and subjective comfort need a real playtest; mocked
Three.js tests cannot establish those outcomes.
