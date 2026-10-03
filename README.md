# Taipei Sunset Drive V48

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
