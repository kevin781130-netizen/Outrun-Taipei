# Stage37 / CHAIN3 — 從 OutRunners 逆向證據吸收街機感，保留台北版自創氮氣

## 試玩

`index.html?handling=v59&drift=chain3`。獨立紀錄標記 `:H59.3`，保留 `?handling=v59&drift=chain2`、V59 與 Legacy 既有手感。正式競賽入口不改。

## 使用者 Stage36 逆向證據與可採用的設計語言

資料來源：使用者提供的 `OutRunners_Stage36_Real_MAME_Write_Tap_Validation_Toolkit(3).zip`（查閱其中以下文件；不移植原作 ROM／素材／音效）。

| 研究依據 | 已確認的原始資料 | 台北版獨立設計取向 | 禁止誤稱 |
| --- | --- | --- | --- |
| `README_STAGE35_zh-TW.md` | V70 `0xA402–0xA47F` 候選區段進度跨界並保留餘量、路徑指標切換；`0xA632–0xA69B` 帶有界限制及路徑偏移索引 | 連續左右路線與甩尾不中斷：跨路段保留 yaw/slip/lateralVelocity/集氣（Stage36 第一刀）；彎道要控制循跡，不做瞬間重設 | 未動態確認此資料就是玩家物理，沒有移植段界常數 |
| `README_STAGE35_zh-TW.md` | `0xA7F2–0xA82C` 以 12-bit 相位包回、`0xA83E–0xA858` 為候選三軸座標資料流 | 把車頭偏角、側滑角、橫向位移分開處理，讓車子真正「橫著走」；不以視覺角度冒充移動軌跡 | 沒證明相位值是車頭 yaw 或輪胎 slip |
| `README_STAGE33_zh-TW.md` | `0x190B–0x197F` 工作項目旗標使用不同進／退閾值與 rising-edge 偵測 | 參照街機**操作辨識的設計原則**：短反打修線、明確長反打換側，避免每幀輸入抖動；CHAIN2/3 已有獨立門檻 | 這是控制旗標流程，不是甩尾物理或 Sega 原版反打門檻 |
| `README_STAGE17_zh-TW.md` | 投影相關 helper 中有追趕目標值、分段／相位選擇（例如 `0x55FC–0x561E`） | 視覺跟隨和車身滑移保持平順，使手感有速度感；沿用既有 Three.js 鏡頭與車體 | 原 ROM 投影更新不能直接當實際轉向物理 |
| `analysis/physics_verification/STATUS_zh-TW.md` | G0 靜態 ROM 指令核對通過；G1–G7 動態駕駛、甩尾、撞擊與真實公式未通過 | CHAIN3 參數為台北版 clean-room 調校；保留來源界線及重放測試 | **沒有**取得原版完整速度／碰撞／甩尾公式 |

### 吸收「街機感」的實際機制

1. **拿掉低檔／高檔操作的負擔**：CHAIN3 由單一加速曲線驅動，原控制仍維持 Legacy；不刪共用鍵盤與遊戲手把框架。
2. **300 km/h 不是巡航黏住上限**：直線 265 左右會開始漸緩，氮氣衝刺後速度平順退回；不是牆式跳變。這是台北版自創速度模型。
3. **彎道與慣性有回報**：超過曲率建議速度時增加衰減、降低抓地，漂移能修線但持續滑會付出速度，並非一律全油門平推。
4. **卡漂是實際位置移動**：滑角額外驅動 lateralVelocity；方向切換採動態角度過零，不傳送位置；繼續使用道路邊界檢查。
5. **台北自創集氣／氮氣，不來自 OutRunners**：小角度小集氣、大角度大集氣，以角度、速度和時間累積；氮氣庫存與出彎衝刺保留。OutRunners **沒有氮氣系統**，絕不宣稱有原版氮氣公式。

## 回歸與限制

- `tests/stage37-kart-loop.cjs` 驗證無換檔、角度集氣大小、左右長漂橫移、30/60/120 Hz、300 非永續速度與急彎代價。
- `tests/v56-drift-replay.cjs` 要求 Legacy `stepArcadeMotion` 區塊指紋固定為 `511b772f`，CHAIN3 已另用 `stepArcadeMotionChain3`，不篡改既有原版模擬。
- `tests/stage36-chained-drift-browser.cjs` 保護上一版方向切換與 WebGL 手感；新模式仍需玩家實際遊玩／調校。
- ROM 動態 G1–G7 未完成前，**不說已復刻 Sega 物理**。全部定數由本專案獨立定義，且暫不合併 main。
