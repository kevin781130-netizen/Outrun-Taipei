# Stage38 · CHAIN4 慣性卡漂／大小漂集氣／出彎回速

## 試玩與隔離

- `index.html?handling=v59&drift=chain4`
- CHAIN4 繼承 CHAIN2 的連續左右反甩與 CHAIN3 的免換檔操控，新增 score key `:H59.4`；V58、V59、CHAIN2、CHAIN3 皆保留，不得覆寫舊版最佳成績。
- 保留既有台北 15 段路線、原創美術／碰撞判定、雙槽氮氣、駕駛／交通邏輯與公開主線。

## 逆向參考檔案（確實查閱）

這一刀依據使用者提供的 `OutRunners_Stage36_Real_MAME_Write_Tap_Validation_Toolkit(4).zip`，其 SHA-256 為 `4384abc21f9ade56b22fee3b39dc6dd1a0813c0dd7188ce7183f6947ef1c3218`，與先前 `(3).zip` 內容完全相同。

| 解構包內具體證據 | 能合理採用的設計原則 | 在 CHAIN4 中的原創應用 |
| --- | --- | --- |
| `README_STAGE19_zh-TW.md`：8 格 P1/P2 輸入歷史環、32-bit 按下／放開 bit 操作；未證明方向盤各 bit 意義 | 當前控制＋歷史狀態分離，短脈衝不應無條件覆寫車體狀態 | 沿用 CHAIN2 反打的時間／方向辨識；保持側向速度狀態，不因新 steer 立刻改變符號 |
| `README_STAGE33_zh-TW.md`：工作項目控制 flag 的進出門檻、rising-edge 偵測；**不是已確認的駕駛物理** | 操作辨識可採遲滯（hysteresis）與邊緣偵測的穩定性概念 | 沿用獨立定義的長反打門檻和實際 yaw/slip 過零門檻，沒有複製 ROM 數值 |
| `README_STAGE35_zh-TW.md`：`0xA402–0xA47F` 段界切換保留剩餘進度；`0xA7F2–0xA82C` 12-bit 候選相位；`0xA83E–0xA858` 座標候選（真實物件尚未辨識） | 連續路段不等於操控狀態瞬斷；姿態與路徑位移是不同層的資料 | 跨台北分段保留橫移／滑角；CHAIN4 用 `slipAngle` 持續改變 `lateralVelocity`，車身視覺仍由原本 Three.js 呈現 |
| `README_STAGE17_zh-TW.md`：工作項目目標值逐步趨近，尚非玩家 steering 公式 | 漸近而非瞬間翻轉的街機動畫／操控節奏 | CHAIN4 横移一階指數緩動 response 4.7，左右連甩不瞬移 |

`analysis/physics_verification/STATUS_zh-TW.md` 明確記載 ROM 靜態驗證 G0 PASS，而 MAME 動態遊玩 G1–G7 未完成。**不能把上述資料冒稱原版遊戲真正的轉向、漂移、碰撞公式或速度常數。**

## 本次物理參數（皆台北版獨立設計，不是 ROM 值）

| 系統 | CHAIN3 | CHAIN4 |
| --- | --- | --- |
| 橫向追趕反應 | 7.2/s | 4.7/s：橫移方向延續時間更長 |
| 側滑額外位移係數 | 0.72 | 0.88，物理橫移速度限幅 ±1.06 |
| 漂移速度阻力 | 基礎 2.2、每度 0.28、每曲率 2.2 | 基礎 4.2、每度 0.52、每曲率 2.55 |
| 曲率建議速度 | 267 - 35×abs(curve) | 267 - 37.5×abs(curve)，下限 112 |
| 過速失速係數 | 0.94 | 1.04，漂移過速仍需付出失速代價 |
| 氮氣升速後回落 | boost soft limit 291、drag 1.28 | boost soft limit 288、drag 1.75；不長時間卡在 300 |
| 漂移充能 | 隨側滑角非線性增長 | 原非線性曲線 × 穩定持續時間 0.66–1.00；換側過渡期 0.7 倍 |
| 出彎回速 | 依原 V59 放油／補油操作 | 附加**非氮氣**微幅回速：漂移至少 0.4 秒、曾達 ≥9.5° 滑角、抓地足夠且未剎車，獲得 0.48 秒、最大 18 km/h/s 的有限加速；不與氮氣疊加、不超過巡航軟目標 |

**設計取捨：** 大漂充能快、橫移強，但磨胎失速更重；小漂能微調方向但集氣慢；合格平順出彎才可以用一小段回速彌補摩擦損失。CH4 不另設車頭吸附、原地滑行、穿牆或自動過彎。氮氣完全是台北版原創玩法；**OutRunners 並沒有氮氣系統**。

## 驗收

- `tests/stage38-arcade-feel.cjs`：角度與時間集氣單調性、反甩過渡期充能保守性、合格出彎回速、短／小／煞車甩尾禁止獎勵、氮氣與出彎回速不可疊加、30／60／120 Hz 側向慣性、300 減速及急彎懲罰、舊版 isolation。
- `tests/v56-drift-replay.cjs` 的 Legacy 物理指紋仍為 `511b772f`。CHAIN4 修改的是原有 opt-in 支線及獨立 `stepArcadeMotionChain3`，無碰觸 legacy `stepArcadeMotion`。
- `npm test` 與 `npm run test:browser` 的最終 PASS 以 PR 的實際 GitHub Actions 結果為準；軟體 WebGL 不取代玩家實際手感測試。

## 下一輪玩家驗收問題（不預設已通過）

能否在急彎之前選擇小飄過彎／大飄犧牲速度集氣？連續左右甩尾是否有持續的橫向滑動但仍可回正？氮氣最高速度是否需要再短一些？只有實際玩過後才可定稿。
