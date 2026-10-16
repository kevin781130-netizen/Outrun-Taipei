# Stage36 · 台北路線交接甩尾連續性（第一刀）

## 症狀／確定的程式原因
* 切換至下一段台北路線時，`finishStageTransition()` 已以 `preserveLane=true` 保留車道，但其後仍無條件呼叫 `resetDrivingState()`，將甩尾角、側滑、角速度、側移速度與甩尾集氣狀態歸零。
* 這是已在目前遊戲程式中確認的中斷原因，與原街機物理是否經動態驗證無關。

## 最小修改（只在 opt-in 的 V59 生效）
* 在 `?handling=v59` 下，路線交接只更新路段／場景／車流，保留進站前的物理狀態與 grip；仍沿用原有橫向有效車道邊界 clamp。
* 速度、氮氣、台北路線圖、站點選擇、相機、渲染器、碰撞系統保持原樣。
* 不帶參數的預設 Legacy 仍會重置，避免未經同意改動既有計時回放與榜單。V59 使用既有的 `:H59.1` 成績隔離。
* `tests/stage36-route-drift-continuity.cjs` 覆蓋左／右岔路 × 左／右甩尾；驗證交接瞬間所有物理量、集氣/氮氣、路段以及下一幀甩尾不中斷。另檢查 legacy isolation。

## 來源邊界
使用者提供的 `OutRunners_Stage36_Real_MAME_Write_Tap_Validation_Toolkit` 中，`analysis/physics_verification/STATUS_zh-TW.md` 明載 G0 靜態核對通過，G1–G7 動態驗證未完成。Stage35 的路徑區段／座標更新只可作為**設計研究參考**；本次沒有搬用 Sega ROM、二進位資產、未驗證的甩尾/碰撞公式或記憶體常數。

## 驗收限制與下一刀
本 commit 提供獨立測試；Actions 的 `npm test` 和 Chromium browser gate 需看真實 CI 執行結果，**不可將提交測試當成已測試通過**。下一刀另處理左↔右連續甩尾（機械反打）的動態與視覺回授；本刀不更動 V59 模型以免混淆兩個問題。
