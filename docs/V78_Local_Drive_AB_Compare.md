# V78 — Import two opt-in drive traces and compare locally

## Usage
In the standalone browser playtest, choose **自由巡航**, open **K / DRIFT LAB** and scroll to **V78 本機 V68 / V69 比較**. Select two files separately, one saved after a V68 run and the other saved after a V69 run. The importer accepts prior V76 / V77 JSON exports using schema `taipei-driving.v76.player-drive.1` and reads them **locally in this browser only**. The **清除匯入資料** button releases both in-memory recordings. No backend, upload, localStorage or files sent to the project.

### Hard correctness gates
- JSON/file must be at most 8 MiB, be in the recognized recording schema and contain 30–5,400 60-Hz frames.
- Mode must match the dedicated V68/V69 field, and every frame must use the single same authored route and valid physical numeric fields / drift FSM; longitudinal coordinate cannot rewind.
- Both recordings must be from the **same route**. Their longitudinal Z ranges must overlap by at least 1,200 internal distance units, with **30+ real samples from each** within the overlap.
- Their mean speed inside the overlap must differ by **no more than 25 km/h**; each needs at least **10 real curve samples** (|curve| ≥ 0.8).
- If any precondition fails, block the comparison and explain why; never produce a "winning" mode or confident causal claim.

### What it shows
After gates pass, the panel reports the common route, overlap length, sample counts, mean speed, mean absolute lateral velocity, mean absolute steering and drift-frame percentage **for each run**. Data remain descriptive: different players or even the same human using different inputs, traffic, initial positions, timing, and free-roaming paths are NOT statistically matched. A lower |lateral velocity| alone is not higher quality, and means are sample-weighted, not per-position experimental controls.

V77's individual on-device post-drive report and opt-in/90-sec recording remain intact. No interaction with vehicle control, speed, nitro, camera, route logic or competition namespace `61.0`. All prior previews and the official production remain unchanged.

## Verification
- `tests/v78-local-drive-compare.cjs`: deterministic V68/V69 sample-value checks and rejection of malformed files, excessive size (UI), wrong schema/mode, reversed progress, mismatched routes, inadequate overlap/curve data and divergent speed.
- Extended `tests/v76-recorder-browser.cjs`: real Chromium opt-in drive+download and test-fixture import through actual native file controls, rejected wrong route, delete and screenshot. The second JSON is **synthetically derived in the test** to validate import plumbing; it is not misrepresented as independent human driving evidence.
- Require `npm test` and `npm run test:browser` plus isolated public GitHub Pages preview. Green code/browser tests do not replace actual deployed-CDN visual review.

Game development constitution: only a bounded local diagnostic in the Legacy Stable branch; large game systems should use Unity Primary.
