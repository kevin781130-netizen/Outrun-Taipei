# Taipei Sunset Drive V43 — OutRunners Taipei

原創台北街機公路遊戲。以 OutRunners 的公路節奏與場景層次、NEXON 跑跑卡丁車的甩尾集氣／加速循環為設計參考；未使用原遊戲素材。

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

## V43

- 水岸場景加入明確的 land / water 表面分類：一般街屋、樹木、岩壁只在陸側生成；水側改成船艇、浮標等水上物件，連富貴角路段也不再把陸上景物畫進海裡。
- 市民與環東高架加入橋下淨空門檻；坡道高度不足時不生成橋下街區，避免建築穿進橋面。橋面、護欄、遮擋仍共用同一組道路幾何。
- 甩尾儲氮維持最多兩枚、N 釋放 2.8 秒；乾淨收尾新增短暫 CLEAN EXIT 推進與尾焰，讓「甩尾集氣 → 出彎 → 氮氣」循環更連續。
- 近處道路繼續遮住遠處建築與橋下物件；交通車與街景依距離共同排序，並保留高速／倒車 swept collision 與道路邊界限制。
- 街屋、海面、水側小艇／浮標、高架橋下空間與 HUD 版本標示同步更新。

`Taipei_Sunset_Drive_V40.html`、`README_V40_TRUE.txt`、`docs/README_V40.md` 和原預覽圖是 **V40 歷史封存**，不是目前遊戲入口。

## Verification

僅開發測試需要 Node.js 22+：

```sh
npm install
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

829 項狀態／幾何／流程檢查覆蓋十五條路線、兩種色調、街機／單段道路、十六條分岔組合、coastal 水陸分離、高架淨空、甩尾氮氣、碰撞、計時和巡航。瀏覽器測試另檢查桌機與手機橫豎版的操作及 JavaScript 錯誤。詳見 [V43 驗證紀錄](docs/V43_Verification.md)。
