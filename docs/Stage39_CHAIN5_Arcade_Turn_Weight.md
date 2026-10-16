# Stage39 — CHAIN5：從解構證據抽取街機控制原則、實作可測量的轉向重量感

## 入口與相容性

試玩網址：`index.html?handling=v59&drift=chain5`，排行隔離 `:H59.5`。CHAIN5 繼承 CHAIN4 的免換檔、實際橫向卡漂、彎道磨速、台北版自創漂移集氮與出彎回速。舊版 `main`、`?handling=v59`、CHAIN2／3／4 的行為和成績 key 不受這一刀修改影響。

## 解構來源：使用者實際提供 Stage36 ZIP

來源：`OutRunners_Stage36_Real_MAME_Write_Tap_Validation_Toolkit(4).zip`
檔案 SHA-256：`4384abc21f9ade56b22fee3b39dc6dd1a0813c0dd7188ce7183f6947ef1c3218`。

**實際確認的事：**

- `README_STAGE33_zh-TW.md`：工作項目控制旗標（`0x190B–0x197F`）使用前一輪旗標做進／出狀態的遲滯門檻和 `(~old)&new` rising-edge。**它是數位控制／工作事件程序，不能視為原版方向盤或漂移程式**。我們只借鑑「不同進退門檻、前後狀態分離」的街機設計原則。
- `README_STAGE35_zh-TW.md`：候選路徑段界 `0xA402–0xA47F` 保存剩餘進度，`0xA7F2–0xA82C` 使用相位值回繞，`0xA83E–0xA858` 是三個 32-bit 座標候選寫入。其玩家車身意義尚未由 MAME 證實。CH5 沿用已寫好的換區不重設角速度／側滑／橫移，將車頭轉角與真實橫向位移分離。
- `README_LIVE_TRACE_zh-TW.md`：附可執行 MAME Lua write-tap／場景 A/B 對照方案，但 ZIP **沒有真正遊玩 CSV**。`analysis/physics_verification/STATUS_zh-TW.md` 僅 G0 靜態 ROM 錨點 PASS，G1–G7 動態甩尾、碰撞、速度公式未獲證實。**沒有移植 Sega 原作公式、ROM 定數或音畫素材**。

## CHAIN5 原創手感調整

| 控制面 | CHAIN4 | CHAIN5 |
| --- | --- | --- |
| 類比方向輸入 | 直接依目前軸向輸入判斷換側 | 小輸入啟動門檻 `0.13`、離開門檻 `0.07`；平滑回應 `16/s`，避免類比雜訊造成回正／重起漂 |
| 漂移車頭追趕 | 偏角回應 `29/s`，側滑回應 `25/s` | 偏角 `24/s`、側滑 `19/s`，保留反甩的車身重量感，仍需角度連續過零才能切向 |
| 漂移實際橫向推移 | 側向額外係數 `0.88`、回應 `4.7/s` | 側向係數 `0.94`、回應 `5.25/s`，仍沿用道路邊界與側向速度上限 `±1.06` |
| 高速彎道 | 曲率建議速與過速磨速 | 增加漸進的 `cornerLoad`（上升 `7.5/s`、釋放 `3.8/s`），高於建議速越多則越強烈推頭、降低 grip steering authority、磨速；駕駛可以透過預先減速降低壓力 |
| 出彎回速 | 合格真實漂移結束 `0.48s × 18 km/h/s` | 限制改為 `0.42s × 21 km/h/s`，更短、更有出彎瞬間感；不與氮氣疊加、不能在每次左／右反甩中間刷取 |

所有數字皆為本遊戲**獨立調校的試驗參數**，不是原作逆向得出的物理常數。前方彎道 HUD 新增超速推頭提醒。

## 回歸和驗收

- `tests/stage39-arcade-input-corner.cjs`：小幅類比雜訊／反打追趕、左右彎×30/60/120 FPS 曲率壓力單調性、CHAIN4 同場對照、彎道出速與直線釋壓。
- 繼承 Stage38 的漂移大小集氣、真正出彎回速／不與氮氣疊加、無換檔、長漂橫移檢查。
- `tests/stage36-route-drift-continuity.cjs`：左右台北岔路必須保留 CHAIN5 漂移與集氣狀態。
- `tests/stage36-chained-drift-browser.cjs`：Chromium 實際鍵盤＋WebGL＋無換檔 UI＋漂移集氣。
- 原始 Legacy 模式 `stepArcadeMotion` 保持 source fingerprint `511b772f`；所有正式名次隔離。**CI 未 PASS 或玩家未實玩之前不合併 `main`。**

真正街機感需要在實際鍵盤、手把及多條台北彎道反覆試跑，僅有靜態 ROM 證據與單元測試無法證明手感已與 OutRunners 完全一致。
