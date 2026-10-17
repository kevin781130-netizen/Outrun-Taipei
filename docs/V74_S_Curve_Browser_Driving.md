# V74 — Real-browser continuous S-curve driving gate

## Purpose
V72–V73 used the game's production physics functions in synthetic paired tests.
V74 adds a bounded *browser-level* input and WebGL regression using the full
legacy `update(1/60)` game loop, to catch issues omitted by isolated motion tests.

## Actual input / route protocol
- Loads the **real local Three.js/WebGL page in Chromium**, with a temporary,
  test-only read bridge injected in the HTTP response. Source `index.html`
  and all deployed builds remain untouched.
- Selects actual authored S-curves on **4D (Xinyi)** and **5C** dynamically by
  locating road-segment curvature of opposite signs and sufficient magnitude.
- Runs each route separately with V68 and V69 drift-exit modes (4 browser
  scenarios in one Chromium page), starting at a measured first bend.
- Uses **Playwright keyboard events**: forward throttle, drift modifier and
  curve-direction arrow, then opposite arrow for countersteer; releases keys,
  **drives naturally through the intermediate road without teleporting**,
  and performs the mirror sequence at the second bend.
- At 60 Hz, checks the actual `update` loop stays alive, road curvature
  has both signs, the car moves monotonically forward, true drift states occur
  in both bend entry phases, finite speed and lateral motion, no crash,
  unchanged competition namespace `61.0`, and an initialized WebGL renderer.
- Captures 2 real 3D canvas screenshots per scenario (8 total) plus
  structured JSON containing the exact curve pair, input-phase frame counts,
  drift counts, peak lateral velocity and route/record integrity.
  The existing GitHub Actions `game-browser-qa` artifact contains them.

## Constraints and limitations
This is an **automated scripted keyboard playtest**, not a recording from a
human player. Keyboard events are real browser input, but chosen deliberately
by the test. Road geometry and the browser's complete update/render code are
authentic. The test does not prove aesthetic correctness or handling enjoyment
and should not justify a physical tuning change by itself.

Does not assert equal whole-run physics: V69 is specifically intended to
alter neutral exit settle; the only invariant is that deliberate active
steering is never unexpectedly overridden (covered by V73).

## Safety and next gate
- Test-only branch: `test/v74-s-curve-browser-playtest`, based on
  `test/v73-driver-intent-guard`.
- Files changed: new `tests/v74-s-curve-browser.cjs`, this note and
  `package.json` browser-test command. No production physics, scoring,
  route progression, JavaScript assets or UI changed.
- `npm test` remains unchanged; `npm run test:browser` gains V74.
- Legacy production, approved V60 and every V61–V71 preview stay intact.
- Green tests and screenshot generation are technical evidence **not**
  inspection/approval of a deployed visual result. Human browser review
  remains the gate for future gameplay-tuning release.
- For new major gameplay code follow the repository's Unity Primary policy.
