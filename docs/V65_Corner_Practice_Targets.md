# V65 — Corner Practice Targets (training, not scoring)

## Player experience
V64 recorded *actual* entry and exit speed on a qualified V61 apex.
V65 turns the **previous best clean exit speed for the same bend** into a
visible challenge.

During an ongoing eligible bend, the existing lower-right corner HUD displays:
- `CORNER DRILL · 首次過彎建立基準` for a first qualifying observation.
- `CORNER DRILL · 目標出彎 ≥ 175 KM/H` when a previous valid observation exists.

After a clean V61 apex exit, V64's temporary report adds:
- `建立練習基準` on first record.
- `目標 175 · 目標達成 1/1` if the *pre-existing* best exit target was met.
- `目標 175 · 再練一次 1/2` if the exit fell below target.

**Meaning:** the goal is a repeatable personal-practice exit-speed benchmark.
This is not a fastest-lap record or a guarantee that a higher exit speed is
safer or better on every future stage.

## Technical contracts
- Only a V61 qualified clean/perfect APEX exit can update a target or counts.
- Target is read before V64 updates lastExit/bestExit (cannot move goalposts).
- Same route ID, dominant curve direction and 40-segment start bucket
  share a target; unrelated roads or left/right turns do not.
- Best/last speed history remains a memory-only, capped 64-entry map per open
  browser tab, not localStorage nor server telemetry.
- Counter `v65PracticeAttempts` increases only on repeat observations with
  prior best; `v65PracticeHits` increases only when a valid exit meets it.
  Both counters reset on `resetGame()`; in-page history persists across
  runs so a practice target remains achievable after restart.
- HUD target hidden if no run, off-road, reversing or crash. Popup uses
  existing 4.5 gameplay-second V64 coach timer (pausing freezes it).
- No reward points, handling changes, score namespace bump, new dependencies,
  network calls, persistent PII or camera changes.
- `COMPETITION.version` remains **57.0**, identical to V63/V64.

## Checkpoints and release gates
Approved V60 code remains:
`Outrun-Taipei/checkpoint/v60-user-approved-20261017`
at `7dd64411e08143c355218dd57b5b01bf8b32db8a`.
Approved V60 published checkpoint remains:
`GAME-TEST-LAB/checkpoint/outrun-v60-user-approved-20261017`
at `95dc64fb73e74efd55c66d1d1b880f1c53609591`.
Original production entry and isolated V60–V64 preview folders remain
untouched. This PR is stacked on V64, without main merges.

`tests/v65-corner-practice-target.cjs` verifies initial baseline, live
target, exact-hit, missed target, improved personal best, race restart,
new-stage isolation, rejected off-road bend, unchanged score namespace
and physically neutral observations. Full `npm test` and
`npm run test:browser` are required. Actual rendered Pages testing
remains a separate acceptance criterion.
