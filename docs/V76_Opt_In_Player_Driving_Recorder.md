# V76 — Opt-in human driving capture (isolated playtest)

## Player instructions
Open V76's separate URL, choose **自由巡航**, start driving, and open **🔬 DRIFT LAB K**. Click **● 開始錄製**, drive real corners, and click **■ 停止錄製**. Click **下載 JSON** to save a local trace (or **刪除錄影** to discard it). Repeat separately for V68 and V69: changing the lab mode ends the current clip, retaining it for export.

## Boundaries / privacy
- **Opt-in only:** never starts recording automatically or in competitive arcade/sprint.
- **Local-only:** no uploads, no background callbacks, no localStorage/cookies and no network endpoints. Player-initiated browser download is the only file output. Keep downloaded files private unless the player decides to share them.
- **Fixed bound:** one clip, up to 5,400 physical frames / 90 seconds at nominal 60 Hz, in memory, automatically stopped at the cap; 1 clip replaced on starting a new recording.
- **Integrity:** pauses, crashes, route changes, changing V68/V69 and closing the lab terminate recording. The captured session remains available for a deliberate JSON export until deleted or game reset/page reload. The original V71 0.42s neutral-exit A/B statistic remains unchanged.
- **Data:** timestamp, route, exit model, keyboard/gamepad/gyro steering command, smoothed steer, drift modifier, throttle, brake, curve, position, speed, yaw, slip, lateral velocity, road grip, grip-recovery state, current qualified exit-window marker. Counts of drift starts, countersteer starts, recover-to-grip transitions and active-steer grip transitions are descriptive; samples are not validated as a complete human player session automatically.
- **No autonomous control:** telemetry never writes to physics, steering, camera, score, nitro, leaderboard or stage data.

## Validation
`node tests/v76-optin-recorder.cjs` checks opt-in gating, model separation, retention/clear, interruption, 5,400-frame cap, rules namespace `61.0`. `node tests/v76-recorder-browser.cjs` tests actual Chromium pointer interaction, keyboard drift and countersteer, native JSON download, WebGL screenshots and no network telemetry upload.

## Deployment
Feature branch `feat/v76-optin-driving-recorder` stacked on passing V75 test branch. Deploy **only** to independent `GAME-TEST-LAB/outrun-taipei-v76-player-recorder-preview/`; never replace production, approved V60 or V61–V71. Visual screenshots and rendered deployed page require separate inspection; do not equate a passing browser smoke with subjective handling quality. Full source/gameplay file is the parent plus isolated observability hooks, not a physics tuning release.
