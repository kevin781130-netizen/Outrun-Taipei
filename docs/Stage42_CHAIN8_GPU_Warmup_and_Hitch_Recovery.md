# Stage42 — CHAIN8：換圖 GPU 貼圖預上傳與物理補幀上限

## 玩家回報／驗證基線

玩家實玩指出台北分岔換路線會讓正在連續甩尾的車子明顯卡一下。Stage36 的狀態快照本就沒有中斷；Stage41 CHAIN7 修掉換區主執行緒巨幅 Canvas 2D 不可見地標生成、3D 地標同步幾何新建、路牌中文預繪，**其最新完整 GitHub Actions #38860112809 已 PASS**。尚有兩個可能的掉幀因素：路牌雖已畫好，但首次 WebGL 路牌可見時仍需 GPU texture upload；當單幀換圖很慢後，原本 `loop()` 對最大 `dt=0.25s` 會在下一幀一次補算多達 15 次 60 Hz 遊戲更新。

## 獨立調校模式

`?handling=v59&drift=chain8`，獨立最佳成績 `:H59.8`。**繼承 CHAIN7 所有路線／甩尾／集氣／免換檔設計**，沒有修改坡度、分岔、速度、碰撞、滑角、氮氣或台北景點。預設與 CHAIN2–7 全數保持原行為與榜單。

### 1. 將未來路牌 GPU 上傳挪到岔路前

- Stage41 在 route fork lock 時已傳遞 `nextRouteId` + `nextRaceSigns`，每隔 8 幀分配一種 3D 地標幾何（phase=0）與預繪一張下一區 1024×256 中文 CanvasTexture（phase=4）。
- CHAIN8 新增 phase=6：當 renderer 已支援 `initTexture`，預先上傳其中 **一張**已繪好的未來牌面；記下已上傳的貼圖 index，不允許單張重複上傳。
- 使用實際綁定的本地 Three.js r149（`assets/vendor/three-r149.min.js`）`WebGLRenderer.initTexture`，不新增 remote CDN。所有 GPU 呼叫都經原來 Full3D renderer，在真正 render 之後每次至多一張；缺 API 的測試雙身安全跳過。
- `RaceWayfinding` 仍只在 **完整路線 ID＋中文字陣列都匹配**時認領先前 CPU＋GPU 準備的 CanvasTexture；切區前新牌不進入 active scene，路牌名稱、字形與佈局不變。
- 仍有 GPU driver、Shader 首次編譯、其他環境 meshes 的未知風險；**不保證任何硬體 100% 無卡頓**。

### 2. 最高補幀數 4，避免掉幀後操作輸入突然被連跑

- 原本迴圈用 `dt=Math.min(0.25, elapsed)` 並逐幀補算 `1/60`，最壞一次約 15 個 `update()` 才能重新 `render()`。換圖失速之後，過時的方向輸入會被一口氣套用，使正在漂移的方向和時間感出現突然跳躍。
- CHAIN8 在讀取 `dt` 後把 **本幀 + 累積 debt 上限設為 `4/60` 秒**，正常 60fps / 30fps / 120fps 的固定時間步長仍不變。0.25 秒的極端 stall 最多補 4 次，而不是把約 15 次更新塞在同一影格；沒有更改單次物理 timestep，所有漂移／集氣公式也不受影響。
- 這是明確的街機**輸入反應性優先**的取捨：在 >66.7ms 超長卡頓後，會丟棄多餘的模擬欠帳，相比原設定可能讓比賽時間／位移短暫比真實時間慢。它不是完全物理時間守恆方案，因此保留獨立計時／排行榜，以玩家實機 A/B 決定是否採用。

## 真正的街機參考邊界

使用者提供的 Stage36 OutRunners Toolkit 可參考「過關連續、控制狀態遲滯、街機操作反應性」的**原則**，但尚無 MAME G1–G7 真物理量測證明原作使用某種補幀、3D 管線或本專案數值，也不能聲稱復刻。OutRunners 沒有氮氣系統；氮氣仍是台北版原創。

## 回歸門檻

- `tests/stage42-hitch-recovery.cjs`：240ms＋級別掉幀受四步限制，正常節奏與累積小 debt 仍正確；舊模式榜單隔離；用真 Three.js CanvasTexture 驗證未來中文路標 GPU upload 一張一次，GPU 預熱不改 active scene，新區實際認領的是上傳過的**相同** Texture 物件。
- `tests/stage36-route-drift-continuity.cjs`：CHAIN8 左右岔路、左右甩尾仍保留完整物理快照。
- `tests/stage36-chained-drift-browser.cjs`：真 Chromium／SwiftShader WebGL，確認 CHAIN8 預上傳計數增加、路段切換仍維持側滑／氮氣／狀態、下一區無 2D sprite raster miss。
- `tools/build-hybrid.cjs --check`：正式載入的 `assets/hybrid-renderer.js` 和模組來源完全同步。
- 以 **最新 HEAD** 的 CI `npm test` 和 `npm run test:browser` 實際結果為準。Draft PR，不 merge `main`，仍需玩家以鍵盤／手把在 2A、2B、3A–3C 分岔驗證方向延遲和掉幀主觀體感。
