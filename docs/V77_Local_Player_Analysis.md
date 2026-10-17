# V77 — Local post-drive analysis in DRIFT LAB

## What players gain
After explicitly recording a drive in the isolated V76 opt-in laboratory and pressing **■ 停止錄製**, the same panel automatically displays an observational summary:
- Route, selected V68/V69 model, recorded frames/time, drift entries
- Number of real driver **countersteer commands** detected while drifting or recovering
- Time from the first sampled raw countersteer direction to the first observed filtered steering alignment (|steer| ≥ 0.12), including **observed-event numerator and total-event denominator**
- Time from that input to the first observed drift/recover→grip state, again displaying observed/total rather than silently treating censored events as zero
- How many grip-recovery transitions occur while the player is **still steering** rather than neutral
- Peak absolute lateral velocity, integrated absolute lateral motion and net lateral displacement in the engine's internal units

**Interpretation:** input-to-response here is a 60Hz observational sampling measure, **not measured USB/controller hardware latency**. Absence of an event within a short recording is **unknown/right-censored**, not zero milliseconds. Grip recovery is descriptive; these observations do not prove which handling model is subjectively better, nor are two free-form runs controlled paired experiments.

## Implementation / privacy
- Opt-in recording from V76 is unchanged: only in free cruise, manually started, max 5,400 frames / 90s per in-memory clip. Recording has no network I/O; only explicit JSON download persists anything.
- V77 computes the report **once on stop** and caches it on that clip, avoiding full-analysis computation each simulation frame. Browser input, stage and physics calculations remain unchanged.
- Deleting a clip or resetting the game clears analysis as well. Starting a new recording resets the prior result. Export includes exactly the computed `analysisV77` field alongside raw V76 frames, allowing later verification.
- UI uses `textContent` for statistics, no injected user-controlled HTML, no external CDNs or backend. No new player-rating score, dynamic assist or automatic steering.
- Validation: `tests/v77-local-drive-analysis.cjs` tests event timing and censored cases; extended real Chromium `tests/v76-recorder-browser.cjs` verifies the rendered summary after clicking stop, the exact exported JSON data, and deletion of the on-screen report.
- Keep previous V76 preview, protected approved V60, and original production unchanged. Use a distinct V77 preview only when the complete CI passes; the URL and actual deployed view must be checked separately before aesthetic approval.

## How to try
1. Visit the isolated V77 build and select **自由巡航**.
2. Open **K** DRIFT LAB, select V68 or V69, then click **● 開始錄製**.
3. Drive around actual bends: **W + Left/Right + Shift**; countersteer and release.
4. Click **■ 停止錄製**. Read **V77 本機回合分析** and optionally **下載 JSON**.
5. For side-by-side subjective evaluation record V68 and V69 **separately**; do not treat different unpaired road/driver conditions as an objective ranking.

This is a conservative legacy test-only addition. New large game systems must follow the repository's Unity Primary constitution.
