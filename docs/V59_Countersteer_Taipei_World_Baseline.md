# V59 反打甩尾、原創追車與台北地理整合基準

基線：`77b8d72beb23e9d1a06b2db2c4e5618e32857d60`。
分支：`feature/v59-countersteer-taipei-world-20261014`。
本階段屬於 shared data/tooling 與既有 Legacy 行為稽核；尚未修改可玩版，
沒有匯入 Sketchfab 模型，也沒有宣稱完成地圖配準、Unity/WebGL 建置或實機驗收。
資料結構保持引擎中立，可供後續 Unity Primary 與既有 3D 版使用。

## 1. 操控與撞車的實際缺口

`index.html` 的 `stepBrakeDrift()` 已有反打判斷，但反打超過
`DRIFT51.counterRecover` 就進入 `recover`。所以目前反打主要是修剪／結束側滑，
還不是可持續平衡尾部滑移的主要操控。

新操控的驗收目標：入彎轉向產生側滑；反打配合油門能穩定滑移、調整路線；
持續同向加深應有可預測的失穩代價；回正／收油／過度反打的恢復必須能清楚區分。
方向盤／前輪方向、車身朝向與真正移動方向需各自表現，不以反轉車模代替物理。
左右彎、鍵盤／類比輸入、不同渲染幀率、進出彎、氮氣與碰撞都需要回放驗證。
若改變競技行為，採新的 handling/record version，保留 V58 回歸基準及成績隔離。

OutRun 2006 的出版者說明書只作玩家可觀察的高階操作參考：入彎、油煞與
左右修線，不把它描述為任何時候都必須反打。實際模型與參數獨立設計。
來源：[SEGA 說明書掃描文字，Driving / Drifting](https://oldgamesdownload.com/manual/outrun-2006-coast-2-coast-windows-manual-english/)。
不使用遊戲原始碼、ROM、車模、角色、音效或逐格動畫曲線。

現有 `triggerCrash()`／`updateCrash()` 已計算碰撞時間、失速、追車提示與恢復；
`crashPose()`／`runnerPose()`／`drawChaseScene()` 在 2D 中已有喜劇演出資料。
3D 的 `v57SceneFrame()` 與場景模組未接出這套角色／追車狀態。
下一階段應以同一 crash clock 驅動原創 3D 角色的落地、追趕、攀回車內與車體滑行；
暫停必須凍結演出。演出不得重複扣分、重新觸發碰撞或多加一次恢復懲罰。
OutRunners 只作誇張喜劇節奏參考；角色、造型、分鏡與動畫均重新設計。

## 2. 15 條路線的地理契約

完整逐路線候選表在 `data/world-v59/route-geography.json`。
它是待核對規格，不是已匯入的真實道路資料庫；每段目前都標記
`geometryStatus: not-surveyed; no OSM way IDs imported`、`runtimeApplied: false`。

| 路線 | 應呈現的差異 | 結構原則 |
| --- | --- | --- |
| 1A | 府城、紅磚、廣場 | 地面街區 |
| 2A | 中山北路林蔭、河畔、圓山山側 | 城市大道為主，不能整段荒山化 |
| 2B | 市民高架、下層街廓、光華 | 只把實際高架段抬高 |
| 3A | 北投溫泉谷地轉關渡河岸 | 河水與溫泉；不是開放海岸 |
| 3B | 美麗華城市街區轉故宮山麓 | 地面城市轉山麓 |
| 3C | 大巨蛋、松菸紅磚園區 | 地面街廓 |
| 4A | 淡水河岸老街、紅毛城 | 河口，不是整片海面 |
| 4B | 火山岩、硫氣、草原 | 貼地山路，不造通用高架 |
| 4C | 科技園區、基隆河、環東高架、饒河 | 每段各自判斷地面／高架 |
| 4D | 信義玻璃商辦、四四南村 | 地面商圈 |
| 5A | 港池、遊艇、河口與情人橋 | 碼頭車行路；人行橋不給車開 |
| 5B | 北海岸岩岸、海面、黑白燈塔 | 海岸道路；不把燈塔步道變道路 |
| 5C | 陡坡屋群、茶樓、石階、遠海 | 山城車行路；石階僅視覺 |
| 5D | 101、裙樓、路口、都市夜景 | 信義地面街區 |
| 5E | 層疊茶園、茶館、纜車、盆地遠景 | 山路；纜車僅空中視覺 |

道路高程與結構不能由 route archetype 決定。使用原始每段道路的 `bridge`、
`tunnel`、`embankment` 與經核對的地形證據；`layer` 是相對疊放順序，不是公尺高度。
標籤不足時標記 unknown，不憑空補橋。汽車可通行性需核對 `motor_vehicle`、
`access`、單行與連接關係。保留目前「壓縮轉場」標記，直到真實路網接續已驗證。

核對來源：
- [OSM bridge](https://wiki.openstreetmap.org/wiki/Key:bridge)、[layer](https://wiki.openstreetmap.org/wiki/Key:layer)、[motor_vehicle](https://wiki.openstreetmap.org/wiki/Key:motor_vehicle)
- [淡水渡船頭：河口右岸](https://newtaipei.travel/zh-tw/attractions/detail/111403)
- [九份老街：山城及坡地聚落](https://newtaipei.travel/zh-tw/Attractions/Detail/109990)
- [富貴角燈塔](https://www.northguan-nsa.gov.tw/user/article.aspx?Lang=1&SNo=04002855)
- [貓空茶園與山區](https://travel.taipei/zh-tw/news/details/61660)

## 3. 素材授權與真實資料缺口

`data/world-v59/source-catalog.json` 分開記錄程式授權、資料授權、模型狀態與來源。

- GAT 的 `ATTRIBUTION.md` 明確把 `city.json`、`roads.json` 作為 ODbL 衍生資料庫
  提供，但未給自有程式碼／材質通用授權。本階段只下載並稽核這兩份 JSON，沒有搬入程式或材質。
- 實測：1,166 建築要素、3,356 道路幾何片段，其中 1,930 是 footway。
  925 是上游報告的 road ways 數，不能與分段數混用。
- 這些道路只有 `kind`、`points`，沒有 OSM way ID、bridge/layer、access、oneway。
  因此可作街景參考，不能直接變成真實可駕駛賽道或高架判定來源。
- 建築中 706 個高度依樓層估算、350 個是 6 m 佔位高度；另有 109 個 OSM height
  與一個帶照片參考近似外型的 height 記錄。不能宣稱全部都是精密實測模型。
- 原始 OSM 取得日期、JSON 的 WGS84 原點不明；目前約 1.71 × 0.94 km 的 x/z
  公尺座標尚未與全球座標配準。
- MOSAIQ 是 Apache-2.0 的離線建模工具，輸入的 OSM 授權仍獨立處理。
  目前沒有把 Blender 或 pyosmium 加入遊戲執行依賴。
- Overture 的 GitHub 程式庫是 MIT，但 Buildings／Transportation 資料主題是 ODbL。
- tpe3d README 宣告程式 BSD、資料依台北市條款；精確條款未完成核對前不匯入。
- Blosm 是可選離線工具，不能由它的程式授權推定 Google 3D／影像可重新發布。
- 三個 Sketchfab 頁面直接讀取回傳 403。搜尋索引可辨認低模與城市場景的作者，
  但下載包、貼圖、授權版本、實際三角面數都未完成檢查，因此尚未匯入任何模型。
- 宗教建築資料平台目前驗到的是 3.88 KB CSV 索引，並非現成 GLB 素材包。

授權來源：
[GAT pinned attribution](https://github.com/POUND0423/GAT-Taiwan-Pound/blob/f3f6789b30a6a50a106ba66c20947e46f5ff3151/ATTRIBUTION.md)、
[Overture 主題授權](https://docs.overturemaps.org/attribution/)、
[OSMF 遊戲署名指引](https://osmfoundation.org/wiki/Attribution_Guidelines)。

## 4. 可重現檢查

來源固定在 commit `f3f6789b30a6a50a106ba66c20947e46f5ff3151`。
來源清單保存兩份 JSON 的 Git blob SHA 與 SHA-256；原始資料不打包進遊戲。
先由清單的 pinned GitHub 路徑取得 `city.json` 與 `roads.json`，放在同一資料夾，再執行：

```sh
python tools/audit-xinyi-reference.py --input-dir /path/to/reference --output /path/to/report.json
```

工具只讀資料、核對雙重雜湊、檢查有限數值／多邊形／道路線段，輸出可重現報告。
本次實際執行結果已保存於 `docs/audits/v59-xinyi-source-audit.json`。
此檢查只證明該固定版本資料的完整性與結構，不等於場景、道路連通或 WebGL 視覺驗收。

## 5. 後續實作順序

1. 反打甩尾獨立模型與新競技紀錄版本，保留 V58 操控回放作基準。
2. 3D 原創追車角色與車體演出，共用現有碰撞時鐘／懲罰。
3. 信義區資料配準、真實可通行路網、高架逐段證據，先完成一區端到端驗證。
4. 地標資產逐件下載檢查、署名、三角面／材質／貼圖預算與 LOD，再擴展其餘 14 路線。
5. 部署獨立預覽，檢查實際畫面與裝置效能後再考慮主入口替換。
