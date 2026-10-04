# V53 Twin Link WebSocket

V53 把 V52 的同瀏覽器雙分頁 vertical slice 升級為可跨裝置的 WebSocket room service。

## 網路模型

- Browser client 使用原生 WebSocket；Node backend 使用 `ws`。
- A 座建立 6 碼房號並鎖定路段。
- B 座加入後，由伺服器權威產生 shared traffic seed 與同步 `startAt`。
- 客戶端以約 15 Hz 發送可視 race snapshot；伺服器限制 state relay 頻率並做欄位範圍清理。
- 完賽資料由伺服器收集並權威回傳 WIN / LOSE / PHOTO FINISH。
- 玩家 WebSocket 意外中斷時，房間保留 20 秒 reconnect grace；同一座位用 server-issued resume token 恢復。
- 明確按「離開」會關閉房間，不使用 reconnect grace。

## 啟動 backend

Node.js 22+：

```sh
npm install
npm run start:netplay
```

預設：

- HTTP health: `http://HOST:8080/health`
- WebSocket: `ws://HOST:8080/twin-link`

環境變數：

- `PORT`：服務 port，預設 8080。
- `TWIN_PATH`：WebSocket path，預設 `/twin-link`。
- `TWIN_ALLOWED_ORIGINS`：逗號分隔的允許 Origin；空白代表不限制。正式公開服務建議填 GitHub Pages 網域。

## Docker

```sh
docker build -f Dockerfile.netplay -t taipei-twin-link .
docker run --rm -p 8080:8080 -e TWIN_ALLOWED_ORIGINS=https://YOUR-PAGES-HOST taipei-twin-link
```

正式託管平台通常會在容器前終止 TLS，因此外部玩家使用 `wss://` URL。

## 前端指定 WebSocket

可以在 Twin Link 面板填入 WebSocket URL，也可以直接用 query string：

```text
https://YOUR-PAGES-HOST/outrun-taipei/?twinws=wss%3A%2F%2FYOUR-SERVER%2Ftwin-link
```

該網址會保存到瀏覽器設定。留空 WebSocket URL 時仍可使用 V52 的同來源 BroadcastChannel LOCAL fallback。

## 伺服器權威範圍

V53 server 目前權威管理：

- room / A-B seats
- route
- shared traffic seed
- synchronized start timestamp
- room lifecycle
- reconnect token / grace window
- final result

物理仍由玩家端各自模擬，因此 V53 還不是完整 anti-cheat authoritative simulation。下一步若要做排行榜級競技，應把 checkpoint、finish validation 與 deterministic simulation 再往 server 移。

## QA

- Node regression 會真的啟動 WebSocket server，建立 A / B socket、驗證 route lock、shared seed/start、state relay、finish result、resume token 與 health endpoint。
- Chromium smoke 會啟動同一套 backend，兩個 browser page 透過 `ws://127.0.0.1` 建房並配對。
- LOCAL fallback 仍保留，WebSocket 未設定時不影響單機與雙分頁測試。
