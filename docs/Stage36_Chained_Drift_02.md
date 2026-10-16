# Stage36 · 第二刀：CHAIN2 左右連續反甩（隔離試玩）

## 使用方法

從此分支開啟 `index.html?handling=v59&drift=chain2`，才啟用新手感。所有正式入口／預設 Legacy V58／V59 H59.1 的行為不變。CHAIN2 使用 `:H59.2` 成績隔離，避免舊最佳圈速受到新物理規則影響。

## 問題和調整

原本 V59 的反打僅減少 `yawTrim` 和 `slipTrim`，而 `driftDirection` 永遠不會在油門持續時由正變負；必須先收尾／重起才能換向，造成左↔右接續生硬。

CHAIN2 在 V59 上增加最小狀態：
- 持續大幅度反打（輸入 ≥ 0.85、補油、有效抓地及速度）超過 0.11 秒，進入轉換準備；小幅類比反打仍維持修線功能。
- 準備時以既有 yaw spring／slip damping 連續靠近 0；車身偏角 ≤ 5.8° 且側滑 ≤ 3.8° 才切換 `driftDirection`。
- 換向後 0.19 秒平順增加新方向目標偏角／側滑，沿用原始角速度、側向慣性、集氣及 style combo。**不重新觸發起甩**，也不直接設定車身角度。
- 不變更路段、台北地標、交通、碰撞、相機、氮氣速度或車輛資料；承接第一刀的路段切換持續甩尾修正。

上述時間和門檻均為台北版獨立調校的起始數值，**非已確認的 OutRunners 原始公式**。

## 測試

`tests/stage36-chained-drift.cjs`：
- 左／右、30／60／120 Hz、真實 `update(dt)` 與隔離物理循環
- 左→右→左→右連續換向，過程不中斷 drift，角度／側滑方向正確
- 偏角／側滑單幀突變上限、集氣存量與 combo 連續性
- 小幅類比反打不觸發換向；舊 V59 和 Legacy 分隔
- `tests/stage36-route-drift-continuity.cjs` 亦驗證 CHAIN2 跨台北左右岔路仍連續

`npm test` 已將上述測試列為 gate。以 CI 真實狀態為準；無法把模擬測試視為實機手感驗收。

## 已知獨立問題

PR #27 先前 workflow 的 `npm test` 成功，完整瀏覽器驗證在 `tests/v70-traffic-quality-browser.cjs` 的「compositor must register changed car paint」失敗，並非 CHAIN2 測試已通過；須獨立調查。不能用此 PR 直接宣稱全部瀏覽器測試合格。
