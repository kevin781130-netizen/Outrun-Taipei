# V52 Twin Link Browser Bridge

V52 把先前只存在於測試與伺服器概念層的 Twin Link，第一次正式接進 shipping 前端。

## 這一版已完成

- 主選單與遊戲工具列新增 Twin Link 入口。
- `window.TwinLinkBridge` 把既有單機狀態用小型介面暴露給多人 transport，不把物理邏輯搬出或複製。
- 新增六碼房號、A / B 座、共享路段、共享 seed、同步起跑時間、15 Hz 狀態快照、進度差與完賽結果。
- 新增 `netplay/twin-link-protocol.js`，可同時在瀏覽器與 Node 測試使用。
- 新增 `netplay/twin-link-client.js`，目前 transport 使用同來源 `BroadcastChannel`，可用兩個同網站分頁完成 1v1 流程。
- 發布流程不再只複製 `index.html`，會一起發布 Twin Link 瀏覽器模組。
- Playwright 本地 server 會正確提供外部 netplay JavaScript，並驗證 Twin Link 入口在桌機與手機版面存在。

## 為什麼先用 BroadcastChannel

公開站目前是 GitHub Pages 靜態網站，沒有可長駐的房間／WebSocket 伺服器。這一版的目標是先把遊戲端的房間、座位、同步起跑、狀態與完賽協定做成真正可跑的 vertical slice。

下一階段只需要把 `twin-link-client.js` 的 transport 換成 WebSocket，並把既有 `netplay/matchmaker.cjs` 接到長駐服務，就能跨裝置／跨網路配對，而不用再次侵入遊戲物理核心。

## 現有限制

- 目前只能在同一瀏覽器來源的不同分頁／視窗互連。
- 尚未有跨裝置 WebSocket signaling、帳號、斷線重連與伺服器權威物理。
- 對手目前以 HUD 進度與完賽結果呈現，尚未把遠端車輛投影進道路場景。
