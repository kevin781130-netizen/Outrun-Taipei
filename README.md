# Taipei Sunset Drive V52.0

原創台北街機公路遊戲。採用 1990 年代大型機公路賽車常見的高速景深構圖，以及現代甩尾集氣／加速循環；所有程式、美術與音效均採獨立實作。

## Play

用現代桌面或手機瀏覽器開啟 **`index.html`**，或將它放在靜態網站。遊戲本身不需要 npm、外部圖片或網路服務。

- W / ↑ 油門；S / ↓ 煞車；← → / J L 轉向。
- 方向 + Shift 起甩，補油維持滑行，反打或放開轉向收尾。
- 有效甩尾累積氮氣，滿槽存成一枚加速器；最多儲存兩枚。
- **N 使用一枚氮氣，持續 2.8 秒**。加速中仍可集氣，放開 N 不會中斷，按住 N 不會自動用掉下一枚。
- A 前進、Z 倒退；保留高速 Z → A 的氮氣操作。
- Space / E 切 LOW / HIGH；P 暫停；G 車庫；T 路線；M 電台。
- 手把 X 起甩、Y 氮氣、RT 油門、LT 煞車；Start 出發／暫停／繼續。

五段街機、十五條單段計時／巡航路線、AT / MT、夕陽／霓虹色調均保留。

## V52.0
- 新增國道風格綠色距離看板（檢查站／終點 500・300・100 M）與通過提示音。
- 撞車中斷由 4.1 秒縮短為約 2.9 秒，重新起步速度 96 km/h；檢查站通過加入金色閃光。
- 因跑局時間改變，競技版本升為 52.0，舊 V51 紀錄不混用。詳見 `docs/V52_Arcade_Taipei_Evolution.md`。

## V51.1

- 切換分頁時，由 Document 的 `visibilitychange` 事件暫停比賽、釋放按鍵並停止音源。
- P 鍵、手把 Start 或畫面按鈕繼續比賽時，同時恢復音源；選台畫面返回前景也恢復預聽。
- 隱藏或音源暫停時不排程音符，避免背景累積；支援行動裝置的 interrupted 音源狀態。
- 新增 12 項音效生命週期檢查，Chromium 另驗證原生音源、鍵盤／手把／按鈕恢復，以及背景凍結。
- 畫面版本為 `V51.1`；操控與競技紀錄規則仍為 V51.0，因此保留既有排行榜與最佳時間。

## V51

- **Curve-Bound Sideways Drift**：整台車仍會明顯側身，但 visual yaw 會依實際彎道需求限制：小彎約 30–36°、中大彎逐步放大，最高 58°。車身側身與物理橫移完全解耦，避免道路其實不彎卻把車甩向牆。
- **甩尾中同時放氮氣＋集氣**：boost 啟動後 drift charge 不停止；HUD 會顯示 BOOST + CHARGE，真實鍵盤測試會驗證 N 放氣期間氮氣表仍上升。
- **速度堆疊感**：普通加速在 100 km/h 後進入 soft wall，越接近 285 越難往上爬；氮氣則有 28 km/h immediate impulse + 強力高速推進，讓 boost 明顯比自然加速爽。
- **破圖／穿模稽核**：正式停用 V47 / V48 / V49 重疊近景建築，只保留 V50 surface-aware / road-clipped 近景；新增 roadside clearance log、全 15 路線 screenshot smoke、極端側身車模 finite projection 與水面／高架 placement regression。
- **地標重檢**：重畫圓山大飯店、關渡大橋、臺北大巨蛋、富貴角燈塔、九份阿妹茶樓、貓空纜車與台北101的量體／色彩／側面深度。
- **15 路線地理稽核**：每段加入 real-anchor / real-corridor / compressed-link 標記；彩虹橋與貓空纜車明確只作視覺地標，不假裝成汽車道路。
- **Clean-Room**：參考只限黑箱可觀察的「小彎小甩、急彎大側身、反打調線、快速回正」高階手感；禁止 1:1 syntax/control-flow translation、ROM / binary asset、exact handling/animation/camera curve copy、標誌性 mode/UI/licensed identity。
- 遊戲下方固定顯示目前測試版本。

完整規範見 [V51 Sideways Drift & Taipei Reality Audit](docs/V51_Sideways_Drift_Reality_Audit.md)。

## V50

- **Recovery First**：先修復 V49 實玩回報的三個問題：甩尾／氮氣無感、側邊建築異常、鏡頭晃動造成 3D 暈。
- **甩尾恢復作用**：SHIFT 不再被當成全煞車；drift helper 只做輕微速度 scrub，起滑門檻降到 58 km/h，進入甩尾更直接，反打仍可修線。
- **氮氣恢復作用**：甩尾集氮速度由 32 提高到 50；滑移門檻降低，收油甩尾也能以較低效率集氮。N 不再要求同一幀同時按油門，成功啟動會立即給速度 impulse，再進入 2.8 秒 boost。
- **建築安全修復**：停用 V49 過大的 near-camera building occlusion，改用 surface-aware / road-clipped V50 roadside depth；水面不蓋建築，近景 scale 上限 1.10，且用 road clip 保證不穿進道路。
- **降低 3D 暈**：camera lean、curve lean、FOV crop、lateral look、screen shake 全部下修；高速感保留在道路光影與穩定近景，而不是靠大幅晃動。
- **Clean-Room 繼續**：只抽象參考高階畫面分層、道路節奏、操控可讀性；禁止 1:1 syntax/control-flow translation、ROM/disc/archive/asset dump、特定專利／標誌性 mode／UI／licensed vehicle identity。
- **版本辨識**：遊戲下方固定顯示 `CURRENT TEST BUILD · V50.0`，browser smoke 會驗證桌機／直向／橫向三種 viewport。
- 15 條台北／新北 route、地標、LOW/HIGH、325 km/h nitro cap、MOMENT BOOST、visible-only collision 與 Twin Link 保留。

完整規範見 [V50 Clean-Room Recovery](docs/V50_Clean_Room_Recovery.md)。

## V49

- **Clean-Room Max Art Pass**：更積極使用可普遍描述的 3D arcade racing 構圖原則，但所有 code、數值、場景、色彩、車輛、聲音與 UI 仍為獨立實作。
- **操控再放大**：加速度提高、低中速 steering response 更快、高速 authority 更高；收油抓地、煞車旋轉、turn-in bite 與 DRIFT49 起滑／反打／回正都比 V48 更明顯。
- **台北空氣層**：北投蒸氣、淡水／漁人碼頭水氣、信義／內湖夜色光柱、陽明山／貓空薄霧皆由台北 stage identity 原創生成。
- **道路光影密度**：新增 road-light rhythm、近景大型遮擋與更早出現的 acceleration rush；全部沿用 projected Taipei road，不建立新 collider。
- **鏡頭速度感**：speed / road curve / steer / drift angle / chassis pitch 一起影響 presentation，FOV 與 lateral look 比 V48 更有感。
- **測試版本可視化**：遊戲下方固定顯示 `CURRENT TEST BUILD · V49.0`，桌機與手機 browser smoke 都會驗證版本文字存在。
- **三條紅線不變**：禁止 1:1 syntax/control-flow translation；禁止 ROM/disc/archive/asset dump；禁止特定專利／標誌性機制、route UI、licensed vehicle identity。
- 15 條台北／新北 route、地標、LOW/HIGH、325 km/h nitro、MOMENT BOOST、visible-only collision 與 Twin Link 全部保留。

完整規範見 [V49 Clean-Room Max Art Pass](docs/V49_Clean_Room_Max_Art.md)。

## V48

- **Clean-Room Aggressive Pass**：在不碰原始 code / asset / audio / vehicle model / handling table 的前提下，把可普遍描述的 3D arcade racing 特性更積極地獨立重做。
- **操作不再過度保守**：高速仍有重量，但提高 steering authority；低中速 response 更直接。收油 grip、煞車入彎旋轉、DRIFT48 起滑／反打／回正都比 V47 更明顯。
- **車體動態**：新增 chassis roll / pitch / visual load；轉向側傾、煞車前俯都只影響 presentation，不改 collider。
- **更強台北景深**：新增 V48 horizon compression、projected road shadows、大型近景 setpieces 與實際道路邊緣導出的 peripheral rush。
- **速度鏡頭加強**：presentation 同時考慮速度、steer、drift angle 與 road curve，加入更明顯但有限制的 lean / FOV。
- **Clean-Room 再清理**：移除歷史 runtime 中殘留的外部標題 localStorage key 與可辨識音樂命名，CI 也新增阻擋。
- 15 條台北／新北 route、地標、LOW/HIGH、325 km/h nitro、MOMENT BOOST、visible-only collision 與 Twin Link 全部保留。

完整規範見 [V48 Clean-Room Aggressive Pass](docs/V48_Clean_Room_Aggressive.md)。

## V47

- **Clean-Room 操作手感進化**：以獨立模型重做高速轉向、收油重量轉移、煞車入彎旋轉、漂移修線與快速回正；禁止反組譯、opcode/function 對照、1:1 參數／控制流程翻譯。
- **高速更穩、低速更靈**：`v47SteeringProfile()` 會隨速度降低 steering response / authority，數位方向鍵在 250+ km/h 不再像瞬間 full-lock。
- **Grip Line 變得可玩**：收油會提高前輪轉向抓地，煞車會提供小幅入彎旋轉；不必每個彎都靠甩尾。
- **DRIFT47**：最大車身角與 slip 收斂、反打修線更直接、回正更快，保留 V45/V46 的氮氣集氣與 MOMENT BOOST，不複製任何特定 gear-drift 招式。
- **Cinematic Taipei Depth**：新增 horizon haze、大型台北遠中景量體與 foreground framing，urban／expressway／coastal／mountain 各用自己的台北素材語彙。
- **輕量 camera lean**：只在 presentation 層依速度／方向／甩尾角做極小幅傾斜，不改 world coordinate、collision 或 route geometry。
- **Clean-Room gate 再加嚴**：禁止 ROM/ISO/GD-ROM、ZIP/7z/RAR、split `.zNN`、sprite/tile/palette/font/audio dump；shipping runtime 也禁止外部品牌、授權車名與標誌性 mode／gear-drift marker。
- 15 條台北／新北 route、地標、LOW/HIGH、325 km/h nitro、visible-only collision 與 Twin Link 全部保留。

完整規範見 [V47 Clean-Room 3D Arcade Feel](docs/V47_Clean_Room_3D_Feel.md)。

## V46

- **Clean-Room 美術進化**：只參考外部可觀察的構圖、景深、道路節奏與縮放感，不抽取／不匯入參考 ROM 的程式碼、sprite、tile、palette、字型或音效。
- **台北設定鎖定**：新增 `V46_TAIPEI_ROUTE_GUARD`，15 個既有 route 的 ID／名稱／theme／archetype 都加入 regression；V46 美術層不得修改玩家位置、速度、交通或目前路線。另加入 Clean-Room CI gate，禁止 ROM／封裝檔進 repo。
- **Layered Scaler Vista**：依 urban／expressway／coastal／mountain 自動生成原創遠景大輪廓與中景視差，讓高速時的場景層次更接近成熟大型街機賽車，但內容仍是台北／新北。
- **Roadside Rhythm**：以實際道路 projection 生成路燈、反光柱、岸邊路柱、山路植栽等近景節奏物件，強化速度與縮放感；全部是純視覺，不新增 collider。
- **道路透視強化**：加入低對比縱向 depth bands 與路肩反射節奏，沿用每條台北 route 原本 road / rumble 配色。
- V45 的碰撞、換檔、甩尾、325 km/h 氮氣、招牌 clipping、建築淨空與 Twin Link 基礎全部保留。

完整 Clean-Room 規範與台北身份保護見 [V46 Clean-Room Art Pass](docs/V46_Clean_Room_Art.md)。

## V45

- **總體驗收碰撞修正**：移除以 segment 編號假設樹／看板存在的隱形撞擊；交通車只有在當幀真的產生可見 `screenBox`、位於合法道路 corridor 且仍在交通可見區內時才能撞玩家。
- **護欄判定重新分級**：一般路肩只減速；高架硬護欄輕擦只刮碰，只有高速且明顯深入護欄才 crash，避免「旁邊沒車卻突然翻車」。
- **換檔正式進入物理**：LOW 強低速扭力／185 km/h 上限，HIGH 低速拖、高速延伸／285 km/h 上限；加入換檔斷油、RPM 落差、AT 新升降檔點，以及 MT 甜蜜點換檔回饋。
- **甩尾／氮氣加速感重做**：更快起甩與反打、集氮提高；MOMENT BOOST 推力增加。氮氣最高速提高至 325 km/h，加入明顯 camera punch、速度線、畫面 ghost、尾焰與震動。
- **招牌文字嚴格裁切**：新增安全文字 layout；過長文字會縮放／截短／省略，並 clip 在招牌矩形內。分岔路牌、高架路牌、公車 LED 與商店招牌共用安全規則。
- **美術 renderer 清理**：驗收抓到 8 組同名 draw function 被後宣告版本覆蓋；歷史版本已隔離為 `legacyV40_*`，避免「程式改了但實際畫面被另一個函式蓋掉」。
- **立體化再進一步**：街屋增加側面窗、樓板、遮雨棚厚度；摩天樓增加側牆／屋頂面；交通車增加側門線、側裙與輪圈；路面加入低對比補丁、tar seam 與反光路釘。
- V44 的 Twin Link 1v1 配對基礎、coastal 水陸分離與高架橋下淨空規則全部保留。

完整問題清單與修正原則見 [V45 總體驗收紀錄](docs/V45_Acceptance.md)。

`Taipei_Sunset_Drive_V40.html`、`README_V40_TRUE.txt`、`docs/README_V40.md` 和原預覽圖是 **V40 歷史封存**，不是目前遊戲入口。

## Verification

僅開發測試需要 Node.js 22+：

```sh
npm install
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

V48 已擴充至 855 項遊戲狀態／幾何／流程檢查，另保留 8 項 Twin Link 配對核心檢查；瀏覽器測試持續覆蓋桌機、手機直向與手機橫向並收集 JavaScript runtime error。
