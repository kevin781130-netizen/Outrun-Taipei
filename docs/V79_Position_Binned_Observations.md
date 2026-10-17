# V79 — position-binned, input-aware local A/B observations

## User benefit
V78 compares two locally loaded V68/V69 player clips over the same road's entire overlap. V79 adds a **per-position table** below that summary to avoid pooling straight segments, opposite-direction bends or mismatched inputs into a single misleading mean.

- Start from V78's unchanged global minimums: same route, ≥1,200 engine Z units of overlapping drive, ≥30 frames per mode, overall average speed separation ≤25 km/h, and ≥10 bend frames per mode.
- Partition only **complete, globally aligned 400-Z-unit road intervals** in the overlap; use exact integer multiples of 400 rather than anchoring at the beginning of each recording. Each original sample appears in at most one interval.
- Each side must have **≥4 sampled frames** in an interval. Bucket metadata includes sample counts, speed, mean |lateral velocity|, signed/absolute steering, curve direction/type and drift-frame share.
- A bin is explicitly **excluded** if one side has too few samples; turn-type/sign mismatches, mixed turns or curve-magnitude difference >0.35; mean speed mismatch >15 km/h; mean absolute steering mismatch >0.25 or signed mismatch >0.4; drift share mismatch >0.35.
- Show **eligible/total/excluded** counts for *all* bins, detailed rows for first 20 bins (with notice when remaining rows are not displayed). Each accepted row displays physical Z interval and separate V68/V69 descriptive mean |lateral velocity|, speed and |steer|; excluded rows show their exact reason. This is not an overall ranking or an independent paired-control experiment.

## Ethics and product constraints
A lower lateral velocity alone is **not** better handling. Identical road segment and roughly similar mean input and speed is still not identical full input, traffic or human skill. Never present this as causal experimental evidence. If many bins are excluded, gather better on-road data rather than loosening gates. No recording, network upload, persistent storage, vehicle physics, camera or scoring changes. Private JSON stays in the browser. Competitive namespace `61.0` is preserved.

## Validation
`tests/v79-position-bins.cjs` checks deterministic across-position bins, asymmetric local speeds, reverse curvature, steering differences, coverage accounting, UI and memory clear. Extended real-browser `tests/v76-recorder-browser.cjs` validates native JSON imports → visible position bins → wrong-route suppression → clear, preserving WebGL & legacy regressions. It uses two **synthetically duplicated files** derived from one actual scripted drive to check UI wiring, not true independent player trials.

Ship only to a separate GAME-TEST-LAB V79 preview after passing `npm test` and `npm run test:browser`. The source remains a Draft PR stacked on V78; official entry point, approved V60, previous V61–V78 previews and Unity Primary migration direction remain untouched.
