# V45 總體驗收紀錄

V45 是針對實際遊玩回饋做的總體驗收版本，重點不是新增功能，而是把「看起來有、實際沒作用」或「看不到卻會影響物理」的行為移除。

## 驗收發現與修正

### 1. 隱形碰撞

發現兩個獨立來源：

- V44 的道路外側存在一段以 segment 編號取模決定的「樹／看板碰撞」。它沒有對應到當幀真的被畫出的物件，因此可能在完全看不到障礙物時觸發 crash。
- 交通車雖然已有限制道路區域，但碰撞仍可在 `screenBox === null` 時參與 swept collision；山丘遮擋、裁切或尚未被投影時可能先撞後看到。

V45：

- 移除裝飾物的取模式隱形碰撞。
- 交通碰撞強制要求當幀有有效 `screenBox`。
- 非道路 corridor 的交通仍禁止碰撞。
- 超過 authored traffic render zone 的交通仍禁止碰撞。
- 一般路肩只提供減速／震動；高架硬護欄只有在明顯深入護欄且速度高於門檻時才 crash，輕擦不再直接翻車。

### 2. 換檔形同虛設

V44 雖然 LOW / HIGH 有不同速度上限，但缺少真正可感知的扭力落差與換檔過程。

V45：

- LOW：強低速扭力、185 km/h 上限。
- HIGH：低速會明顯拖、高速扭力較強、285 km/h 上限。
- AT 升檔點調整為 168 km/h，降檔點 118 km/h。
- 每次換檔加入短暫 torque cut 與 RPM 掉轉。
- MT 在 145–188 km/h 從 LOW 升 HIGH 會得到短暫 sweet-spot torque pulse。
- HUD / RPM / sound / screen feedback 同步。

### 3. 氮氣與甩尾缺乏加速感

V45：

- 氮氣最高速 325 km/h。
- 氮氣額外推力提高，啟動瞬間加入 camera punch、速度線、輕微 chromatic ghost 與震動。
- MOMENT BOOST 持續時間提高，推力與視覺回饋同步加強。
- 甩尾入甩速度門檻降低、entry 更快、反打更俐落、slip / yaw 更明顯。
- 集氮速率提高至 32。
- 氮氣與小噴仍為不同資源，避免變成單一自動 boost。

### 4. 字穿越招牌

V44 的文字縮放只縮到最小 4px，過長文字仍可能越界，而且 route gantry / expressway sign 有直接 `fillText`。

V45：

- 新增 `fitSignTextLayout()`。
- 所有走 `v40FitSignText()` 的文字現在先 clip 到招牌矩形內。
- 若縮字仍放不下會截短並加省略號。
- route gantry 與 expressway sign 改用同一套安全文字佈局。
- 公車 LED 路線牌也改用安全文字佈局。

### 5. 美術修改被舊函式覆蓋

驗收發現 8 組同名 draw function 重複宣告，包括：

- `drawTaipeiSkyscrapers`
- `drawTaipei101StreetLevel`
- `drawTaipeiShophouse`
- `drawGrandHotelPalace`
- `drawCloudTower`
- `drawLandmarkInstance`
- `drawV40V34CityPanorama`
- `drawV40V34TaipeiShophouse`

JavaScript 會使用後宣告版本，造成前面修改看似存在、實際 runtime 沒有使用。V45 將被覆蓋的歷史版本改名為 `legacyV40_*`，權威 renderer 現在唯一且可追蹤。

### 6. 美術進一步立體化

- 街屋 extrusion 增加側面窗、樓板線與遮雨棚厚度。
- 建築與道路的安全 margin 擴大，避免突出招牌／側牆靠進車道。
- 摩天樓加入方向性側牆、屋頂面與側面窗。
- 路面加入低對比補丁、tar seam 與反光路釘，降低「一張灰色紙帶」感。
- 交通車加入側門線、側裙、輪圈與側面結構細節。

## 驗收原則

V45 之後，遊戲物理遵守：

1. 看不到的交通車不能撞玩家。
2. 裝飾性美術不直接當碰撞器。
3. 碰撞必須與可見幾何來源一致。
4. 招牌文字不能畫出自己的 bounding box。
5. 換檔必須同時改變扭力、速度範圍、RPM 與回饋。
6. 氮氣必須同時改變物理速度與視覺速度感。
7. 同名 renderer 不允許重複宣告。

## 尚未宣稱完成的部分

V45 仍是 Canvas 2D / pseudo-3D 架構。這次已把體積、遮擋、碰撞與視覺一致性大幅硬化，但它仍不是 WebGL 真 3D。若要進一步消除所有視角下的穿模，下一個大型里程碑應把建築、交通車與道路裝飾拆成真正的 3D scene graph，並把 physics collider 與 render mesh 綁在同一份 world entity 上。
