# V46 Clean-Room Art Pass

## 原則

V46 把 OutRunners 當成外部黑箱／公開畫面參考，只觀察「玩家能看到的視覺方法」：

- 遠景、中景、近景明確分層。
- 大輪廓優先於小細節，讓高速移動時仍能辨認場景。
- 路肩與道路邊緣用規律物件形成速度節奏。
- 背景物件具有強烈縮放／視差，讓道路看起來向前衝。
- 每個 stage 用少量高辨識度景物建立身份。

不做以下行為：

- 不拆 ROM code。
- 不抽原始 sprite / tile / palette / font / audio。
- 不複製關卡座標或資產排列。
- 不把原作品牌、角色、招牌或國家場景直接搬進台北版。

## 台北身份鎖定

V46 新增 `V46_TAIPEI_ROUTE_GUARD` 和 regression check，固定 V45 的 15 個路線節點：

1A 總統府 & 凱達格蘭大道  
2A 中山北路 & 圓山大飯店  
2B 市民大道高架 & 光華商場  
3A 北投 & 關渡  
3B 大直 & 故宮  
3C 松山文創 & 大巨蛋  
4A 淡水老街  
4B 陽明山  
4C 內湖科技園區 & 環東大道  
4D 信義街區  
5A 淡水漁人碼頭  
5B 富貴角燈塔  
5C 九份  
5D 台北 101  
5E 貓空

任何 V46 美術函式都不得修改 `playerZ`、`playerX`、`speed`、`traffic`、`currentNode` 等遊戲狀態。

## V46 實作

### 1. Layered Scaler Vista

`drawV46ScalerVista()` 根據台北 stage archetype 生成原創遠景：

- Urban：大樓群的大色塊遠層 + 中層城市輪廓。
- Expressway：較冷色的高架城市帶。
- Coastal：海岸遠景 + 水面水平節奏。
- Mountain：兩層不同速度的山稜輪廓。

這些形狀全部從現有台北 `scene()`、`v40Art()`、`currentNode.seed` 產生。

### 2. Roadside Rhythm

`drawV46RoadEdgeRhythm()` 使用道路 projection，在路肩規律生成台北版近景節奏物件：

- Urban：路燈 + 小型綠化。
- Expressway：護欄反光標。
- Coastal：岸邊路柱／簡化燈桿。
- Mountain：反光柱 + 植栽。

物件純視覺，不是 collider。

### 3. Road Depth Bands

道路增加低對比縱向帶、邊緣反射帶，強化道路朝消失點收縮的感覺，但仍使用台北各 theme 的原有 road / rumble 色彩。

### 4. 保留 V45

V46 不改：

- LOW / HIGH 扭力曲線。
- 325 km/h nitro。
- MOMENT BOOST。
- visible-only traffic collision。
- 高架硬護欄判定。
- Twin Link matchmaking foundation。
- coastal 水陸分離。
- 建築／高架淨空與招牌文字 clipping。

## 驗收

新增 Clean-Room regression：

- 台北 15 route ID / name / theme / archetype 不可漂移。
- Clean-Room guard 明確禁止 source code / assets / audio reuse。
- V46 art layer render 前後遊戲物理狀態必須完全一致。
- 每個 stage 必須從自己的 archetype 取得 V46 art family。

V46 仍是 Canvas pseudo-3D；它的目標是先把構圖、視差、速度尺度與場景辨識度拉到成熟 arcade racer 水準，而不是把原作資產移植進來。
