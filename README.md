# Taipei Sunset Drive V44 — OutRunners Taipei

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

## V44

- 建築由平面 facade 進化成有屋頂面、側牆深度、窗框凹槽、窗台與陽台厚度的立體化街景；左右道路會顯示不同側面，不再像一張紙。
- 路邊交通車改成 rear + side + roof / trunk 的多面體式視覺，公車、計程車、發財車與機車保留辨識特徵，但不再只畫單一車尾平面。
- 甩尾改為更快的反打回正；乾淨收尾不再免費自動加速，而是開啟約 0.46 秒 MOMENT BOOST 視窗。玩家需要放油再補油才觸發約 0.36 秒小噴，讓操作節奏更接近經典 KartRider 的 drift boost 邏輯。
- 甩尾集氣速率提高，仍維持最多兩枚氮氣、N 使用一枚 2.8 秒；氮氣和小噴是兩套不同資源。
- 修正 ghost collision：交通車一旦離開作者定義的可見交通區、或不在合法道路走廊，就不再參與碰撞；道路邊界撞擊也改成明確的 ROAD EDGE 提示，避免被誤認為撞到隱形車。
- 保留 V43 的 coastal 水陸分離與高架橋下淨空規則。
- 新增 `netplay/matchmaker.cjs` 的 Twin Link 1v1 配對核心：同區域／技能／ping 篩選、A/B 雙座位、共享 race seed 與網路更新頻率規格。完整多人傳輸與伺服器物理仍是下一階段，詳見 [V44 Twin Link 網路架構](docs/V44_Netplay_Architecture.md)。

`Taipei_Sunset_Drive_V40.html`、`README_V40_TRUE.txt`、`docs/README_V40.md` 和原預覽圖是 **V40 歷史封存**，不是目前遊戲入口。

## Verification

僅開發測試需要 Node.js 22+：

```sh
npm install
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

V44 將遊戲狀態／幾何／流程檢查擴充到 835 項，另有 8 項 Twin Link 配對核心檢查。覆蓋十五條路線、兩種色調、十六條分岔組合、立體建築／交通車 profile、MOMENT BOOST、ghost collision guard、氮氣、計時和巡航。瀏覽器測試仍會檢查桌機與手機橫豎版操作及 JavaScript 錯誤。
