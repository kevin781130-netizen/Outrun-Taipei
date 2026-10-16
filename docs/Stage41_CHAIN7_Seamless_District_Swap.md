# Stage41 · CHAIN7 — 修復岔路換圖導致的甩尾卡斷

## 問題與真實根因

使用者在正式實玩回報：從一段台北路線切至下一區時，雖然上一刀的 `driftAngle`、`slipAngle`、`lateralVelocity` 在程式內沒有重設，甩尾仍會卡斷。調查發現實際換路線處理 `setStage()` → `planLandmarks()` 在同步 JS call stack 裡重新生成巨大 2D sprite：`getLandmarkSprite()` 會先建立 1200×1800 canvas，讀回像素，逐列掃描找不透明範圍，再建立裁切圖片。**完整 3D WebGL 模式完全不會顯示這些 2D sprite**，卻仍為它們支付 CPU 和記憶體成本。3D renderer 的 `TaipeiLandmarks.update()` 又會在首次進入下一路線時同步生成地標 BufferGeometry、Mesh、材質及提交 GPU。

這屬於**主執行緒同步阻塞**，不是甩尾狀態被重設。前一版的 Stage36 只確認物理快照連續，並沒有驗證換圖時間及 WebGL 圖形準備成本。

## CHAIN7 具體修復（不改動正式版）

試玩網址：`?handling=v59&drift=chain7`。獨立最佳成績鍵 `:H59.7`。繼承 CHAIN6 的物理、免換檔、大小飄集氣、原創氮氣、橫移慣性及出彎回正；沒有重新調整物理常數。

1. **停止不必要的 2D 光柵讀回**：僅在 `v59Arcade7 && v56Full3D`，以無實際畫布像素的 metadata 比例占位（560×900）供 `planLandmarks` 估算地標位置，不再進入 `getLandmarkSprite()` 的高成本 `getImageData` 流程。仍保留原著作的 `STAGE_LANDMARKS`、場景 node、anchor 選擇演算法及其 3D 地標。這個模式的 3D-only 尺寸是**近似佔位比**，可能相對 CHAIN6 改變某些地標的畫面側向位置，並非原 2D sprite 的實際裁切數據；路面、分岔及碰撞路徑不受影響。所有舊模式／2D 回歸維持原本的精確 2D 圖。
2. **提前準備下一區地標幾何**：在 `FORK_LOCK` 鎖定下一區之後，WebGL frame 只傳遞下一個 `routeId` 到 renderer，不改 game physics。Full3D renderer 每八次渲染最多準備 **一種**下一區專用低多邊形模型；不會提前把它放進正在遊玩的畫面，也不消耗遊戲交通 RNG。
3. **幾何共用快取**：3D 地標模型按 `kind` 快取 `BufferGeometry`。換區首幀只掛載既有 geometry 的 mesh，切回先前造訪路線時複用同一幾何。Active mesh/material 切場景時照樣清理；只有 renderer 最終 `dispose()` 會釋放快取 geometry。
4. **完整 WebGL bundle 同步更新**：用專案的 `tools/build-hybrid.cjs` 拼接規格重新生成 `assets/hybrid-renderer.js`，使已交付瀏覽器實際使用的新預熱機制與 `src/rendering/` 相同。

## 驗收與限制

- `tests/stage41-route-asset-prefetch.cjs`：真 Three.js r149 幾何測試，確認每次最多生成一種 kind，預熱不修改 active scene，切區重用 buffer geometry，反覆重入不再建構。
- `tests/stage36-route-drift-continuity.cjs`：CHAIN7 左右岔路與左右甩尾完全保存物理狀態、N2O、regrip 與正確台北地名路徑。
- `tests/stage36-chained-drift-browser.cjs`：Playwright 真 Chromium WebGL，檢查實際切區前後 side-slip 與充能快照相同、看得到 3D、下一區 **沒有新增巨幅 2D 圖的 cache miss**，並記錄切換函式毫秒數，不設不公平的不同機器絕對毫秒通過門檻。
- **剩餘已知風險**：新路段的 `RaceWayfinding.update()` 仍可能為新路標產生 CanvasTexture，某些裝置的首次紋理上傳／shader 編譯仍可能產生微幅尖峰。這一刀不宣稱所有 GPU shader 佔用已清除；需依瀏覽器 trace 實測迭代。
- 沒有修改碰撞或原始 ROM 算法。OutRunners 無氮氣機制；仍只參考使用者逆向證據中的分段流動、相位連續設計原則。G0 ROM 靜態分析 PASS、MAME G1–G7 真物理實測尚未完成。
- CHAIN6 已在 GitHub Actions run #38856993327 全套 `npm test`／`npm run test:browser` PASS。CHAIN7 需獨立等候本次 HEAD 完整 CI 通過，並由玩家實際經過每條分岔體驗，才適合納入正式版。PR #27 繼續 Draft。
