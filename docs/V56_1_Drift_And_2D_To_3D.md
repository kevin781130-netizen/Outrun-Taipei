# Outrun Taipei — V56.1 實作與 2D → 真 3D 美術移轉紀錄

## 已實作（本分支，非主線）

- `src/rendering/DriftVisualRig.cjs`：將既有甩尾狀態轉成獨立視覺側移、平滑 Yaw、跟隨鏡頭與加速 FOV。
- `index.html` 傳入 `isDrifting / driftState / driftAngle / slipAngle / driftDirection / lateralVelocity / cleanDriftTime / exitBoost / momentBoostWindow / roadGrip`。原物理、計時、碰撞和氮氣計算保持不變。
- `src/rendering/DriftSmoke.cjs`：52 個實例上限之 3D 輪胎煙霧（無網路、無新素材），甩尾啟動、收尾逐步消散。
- `src/rendering/CityArtKit.cjs`：替換原本單一整片玻璃的高樓立面為 6 格分層窗戶、彩色店招、遮雨棚、門面和屋頂設備；亮窗依日夜切換，使用 instancing 以減少 draw calls。
- `src/rendering/Full3DScene.cjs` 接入上述系統；新增 `tests/v56-1-drift-city.cjs` 並更新既有 V56 3D 整合測試。
- `tools/build-hybrid.cjs` 與已提交的 `assets/hybrid-renderer.js` 同步。

**此版本不是全台北地標完成版。** 建築目前是程序式立面實體幾何與材料，尚未將舊版全部台北插圖實際轉成獨立精緻 3D mesh。不要把它寫成「完成所有 3D 美術」。

## 原始 2D 美術的合法 3D 化流程

原 `index.html` 中的 Canvas 2D 繪製函式與 `STAGE_LANDMARKS`、`SCENES` 是 **造型、顏色、地標身份的設計參考**，不是把 Canvas 檔直接立在道路旁當一張 2D 卡片。

| 舊版資產種類 | 正確轉換 | 可驗收的幾何成果 |
| --- | --- | --- |
| 路面、分岔、高架 | 使用 `segments`、`roadCorridors` 生成連續 3D 道路 mesh | 真實厚度、護欄、路肩、路面法線；不穿模 |
| 一般街區、騎樓、招牌 | 共用 `CityArtKit` 的 3D 建築與 Façade Atlas；按城市樣式套用 | 近距離有真實深度、側面也有窗和屋頂設備 |
| 舊版 2D 建築表面繪圖 | 將**自行製作、可商用**的 2D 外觀分層整理成 albedo/roughness/emissive atlas，再貼到立面 mesh | 非透明紙片；UV 與建築層數對齊 |
| 台灣計程車、公車、機車 | 使用各自辨識度高的 3D 車身、輪胎、燈光材質，必要時共享底盤 | 不用一種白盒轎車充當所有車種 |
| 遠距街景與天際線 | 低 LOD 的 3D outline/遠景實例；遠到一定距離才容許 texture impostor | 近景不得看到平面紙片 |
| 台北 101、總統府、圓山飯店、橋與纜車 | 以原有獨立繪製為外觀參考，重建辨識度足夠的 F3 地標 mesh，附專屬材質 | 從側面看仍為 3D 建築，路線辨識度高 |
| HUD、文字、提示 | 繼續採用 DOM/2D UI（不是遊戲世界） | 不遮擋道路、手機不裁切 |

### 最小資產管線（下一階段）

1. 對每個 2D `draw...` 地標函式建立原始造型截圖、名稱、路線 ID、可用權限註記。
2. 建立全新原創 3D 基本形體，先檢查比例與撞牆安全範圍，再添加局部材質。
3. 製作共用 atlas：店招、窗框、玻璃、騎樓、招牌背板、屋頂設備；貼到真實 3D 立面（不是整張貼在空間中的平面）。
4. 匯出 glTF/GLB 或以 Three.js 緩衝幾何表示；具體路線對應資產清單並新增降階 LOD。
5. 每個地標必須有 **近距離、45 度、背面** 實際 WebGL 截圖與渲染效能記錄；無圖不得宣稱通過。

### 立即後續優先順序

- P0：Chrome/手機實測 V56.1 甩尾的入彎、持續、反打、回正、氮氣以及輪煙；確認是否仍有 *物理層* 問題，物理問題才修改 `stepBrakeDrift`。
- P0：實機檢查 15 條路線立面無大片純白、招牌不穿入道路；夜景 emissive 色彩自然。
- P1：資產 atlas 與貼圖工作流，完成 2–3 種真實可重用騎樓街區。
- P1：地標 3D 第一批（101、總統府、圓山飯店），保證不使用來源不明的商用受限模型。
- P2：車種模型差異、真正 3D 高架橋、近景道路材質與壓縮/LOD 效能優化。

## 測試與發布關卡

```sh
npm run check:hybrid
npm run test:drift-city
npm run test:full3d
npm test
npm run test:full3d-browser
```

- 已用真實 Three.js 類別加上 mocked GPU renderer 驗證物件、側滑、車身回正和材質實例行為；**不是實際 WebGL 截圖驗收**。
- GPU/瀏覽器/手機真機畫面：尚未在此開發環境完成。
- 正式前端 `GAME-TEST-LAB/outrun-taipei/` 必須留在 V56.0，直到 V56.1 實機視覺、動作、效能達標才能合併覆蓋。
