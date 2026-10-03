# V44 Twin Link 網路競速架構

V44 把 OutRunners 的雙座／連線對戰精神重新解釋成瀏覽器網路配對，而不是把兩台實體街機直接搬上網。歷史資料顯示 OutRunners 的雙人機台可進行 head-to-head，且額外連接機台可擴充更多玩家；本專案先把這個社交核心收斂成低延遲 1v1「Twin Link」。參考資料：International Arcade Museum / Play Meter 1993 OutRunners 廣告頁。

## V44 已落地

- `netplay/matchmaker.cjs`：1v1 配對核心。
- 區域、技能差距、延遲門檻篩選。
- 每場建立 A / B 兩個「街機座位」、共享 race seed 與固定競技規則。
- 明確的 60 Hz 模擬、30 Hz input、15 Hz snapshot、100 ms rival interpolation 目標。
- 網路對手預設 **不做車體互撞**；這是為了避免不同延遲下的碰撞判定造成不公平與瞬移。
- 交通 seed、比賽開始時間、路線、checkpoint、finish 與 penalty 規劃由伺服器權威管理。

這一版是「可測試的配對與規則核心」，還不是可公開上線的完整多人模式。實際 WebSocket 傳輸、帳號、房間生命週期、斷線重連與伺服器物理仍要再接上。

## 建議的正式網路模型

### 1. 配對層

第一階段只做 1v1：

- Quick Match：優先同區域、低 ping。
- Ranked：加入簡單 rating bucket，等待越久逐步放寬。
- Private Twin：房號邀請好友，等同把「隔壁街機座位」變成網路房間。

不建議一開始就做 8 人。現在遊戲核心、交通與分岔仍是單機導向，先把 1v1 的穩定、同步、反作弊做對，再擴 4 人或 8 人。

### 2. 比賽權威

伺服器應掌握：

- match start timestamp
- route / stage branch
- shared traffic seed
- countdown / checkpoint / finish
- penalty / reset
- final time

玩家端只預測自己的即時操控。不要讓客戶端單方面宣告「我到終點了」。

### 3. 同步方式

建議：

- client → server：30 Hz input frame（steer / throttle / brake / drift / nitro / sequence）
- server simulation：60 Hz
- server → clients：15 Hz state snapshot
- 自車：client prediction + reconciliation
- 對手：100 ms interpolation buffer，不做直接 snap

這比單純每幀傳座標穩定，也比較能保留現在甩尾手感。

### 4. 對手互動

初期建議「看得到、能追尾流、不能互撞」。

理由是網路車體碰撞會同時放大：

- ping 差
- packet loss
- client prediction 誤差
- rewind / reconciliation 誤差

等 shared simulation 抽成可在 server 與 browser 共用的 deterministic core 後，再評估可選的接觸模式。

### 5. 下一階段程式拆分

要真正多人化，核心應從 `index.html` 拆成：

- `sim/physics.js`：速度、甩尾、氮氣、碰撞
- `sim/track.js`：道路／分岔／交通 seed
- `net/client.js`：input buffering / prediction / reconciliation
- `net/server.js`：authoritative room simulation
- `render/*`：純畫面，不再影響碰撞

目前 V44 先把碰撞與渲染有效區域一致化，就是為了往這個方向走。

## 競技設計

Twin Link 不應只是「兩個玩家同時單機跑」。

建議保留 OutRunners 式的街機競速感：

- 同一倒數同一條起跑線
- 對手位置常駐 HUD
- 分岔時顯示對手選擇
- 前後差以秒差／距離差呈現
- 終點立即顯示 WIN / LOSE / PHOTO FINISH
- 連戰 rematch 按鈕，模擬隔壁座位再投一局

KartRider 式甩尾技巧則保留在個人操作層，不讓網路補償替玩家自動做甩尾或小噴。
