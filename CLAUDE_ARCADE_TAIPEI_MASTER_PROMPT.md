# OUTRUN TAIPEI — RETRO ARCADE ANALYSIS & EVOLUTION MASTER PROMPT

你現在不是單純的程式碼助手。

你要同時扮演：

- Principal Arcade Racing Game Designer
- Senior Gameplay Programmer
- Technical Artist
- Rendering / Perspective Specialist
- Game Feel Designer
- UI / HUD Designer
- Audio Feedback Designer
- QA / Regression Lead
- Clean-Room Reference Analyst

你的任務不是「把另一款遊戲複製進來」。

你的任務是：

> 研究一款成熟 1990 年代大型街機公路賽車的優點，找出我的《Taipei Sunset Drive / Outrun-Taipei》在玩法、速度感、操控、構圖、景深、道路節奏、視覺層次、UI、反饋與街機氣氛上的不足，然後只吸收那些真正能讓我的遊戲變好的「設計原理」，以完全獨立的方式重新實作。

最重要的一句話：

> **TAIPEI IS THE GAME. ARCADE IS THE PRESENTATION LANGUAGE.**

台北元素永遠是主體。

街機感只能讓台北變得更強，不能把台北覆蓋掉。

---

## 0. 你將收到的資料

你應該會取得：

### A. 我的遊戲 Repository

Repository：

`https://github.com/kevin781130-netizen/Outrun-Taipei.git`

主要分支：

`main`

目前專案基準約為：

`Taipei Sunset Drive V51.1`

但不要只相信這份 Prompt。

你必須實際讀取 repository 確認目前版本、程式結構、測試、功能與最新狀態。

目前已知專案特色包括：

- 純瀏覽器街機公路遊戲
- `index.html` 為主要 shipping runtime
- 不需要 npm 才能實際遊玩
- npm / Node.js 主要用於開發與測試
- Canvas 原創繪製
- 沒有 runtime 外部圖片依賴
- 沒有 runtime 網路服務依賴
- 台北／新北主題
- 五段 Arcade 模式
- 15 條單段路線
- Sprint / Cruise
- AT / MT
- LOW / HIGH
- Drift
- Drift Charge
- Nitro
- Moment Boost
- Traffic
- Twin Link
- Desktop
- Mobile portrait
- Mobile landscape
- 自製 Web Audio 系統
- Clean-Room tests
- Regression tests
- Browser smoke tests

目前玩法包含類似：

- W / ↑ 油門
- S / ↓ 煞車
- 左右方向鍵轉向
- Shift 漂移
- N Nitro
- LOW / HIGH
- 手把支援

但所有內容仍須以 repository 最新版本為準。

### B. 我會附上一個檔案

`orunners.zip`

裡面是復古大型街機遊戲的 ROM 晶片映像。

這個 ZIP 是：

**REFERENCE ONLY**

不是素材包。

不是要你把內容移植進我的遊戲。

不是要你把 sprite、音樂、聲音、字型、palette、車輛、UI、程式碼拆出來。

### 非常重要

`orunners.zip` 絕對不能：

- 加入我的 repository
- commit
- push
- package
- 放進 shipping runtime
- 被轉成任何遊戲素材
- 被轉成圖片
- 被轉成 audio asset
- 被直接嵌入 JavaScript
- 被重新發布

如果需要暫時解壓研究：

請放在 repository 以外，例如：

`/tmp/orunners-reference/`

或：

`../arcade-reference/`

完成研究後可以刪除。

### 特別注意

我的 repository 已經存在：

`tests/clean-room-compliance.cjs`

它會故意阻擋：

- `.bin`
- `.rom`
- `.zip`
- `.7z`
- `.rar`
- `.iso`
- `.chd`
- ROM signature
- 外部遊戲品牌
- 其他禁止資產

所以：

**不要把參考 ZIP 放進 Outrun-Taipei repository root。**

---

## 1. 使用 RTK 減少 Token 消耗

你必須使用：

`https://github.com/rtk-ai/rtk.git`

目的：

降低 Bash / shell output 進入你的 context 所產生的大量無效 Token。

---

## 2. RTK HARD RULE

開始工作前先確認：

```bash
command -v rtk
rtk --version
```

如果沒有安裝 RTK，可以優先：

```bash
cargo install --git https://github.com/rtk-ai/rtk.git
```

或依環境使用官方支援安裝方式。

Claude Code 可使用：

```bash
rtk init -g
```

如果 hook 因為目前 session 尚未重新啟動而沒有生效，就不要浪費時間重開工作。

直接顯式使用：

```bash
rtk ...
```

---

## 3. RTK TOKEN POLICY

整個專案分析期間，盡可能使用：

```bash
rtk ls .
rtk find
rtk read
rtk smart
rtk grep
rtk git status
rtk git diff
rtk git log
rtk test
rtk err
rtk playwright
rtk gain
```

例如：

```bash
rtk ls .
rtk read README.md
rtk read docs/V51_Sideways_Drift_Reality_Audit.md
rtk read tests/clean-room-compliance.cjs
rtk smart index.html
rtk grep "DRIFT51" .
rtk grep "V51_" .
rtk grep "ROUTE_REALITY" .
rtk grep "LANDMARK" .
rtk grep "nitro" index.html
rtk grep "traffic" index.html
rtk git status
rtk git diff
```

### 不要一開始就：

```bash
cat index.html
```

因為 `index.html` 很大。

先使用：

```bash
rtk smart index.html
```

再：

```bash
rtk grep
```

鎖定區域。

最後只讀真正需要的內容。

---

## 4. Claude Code Built-in Tool 注意事項

RTK hook 主要攔截 Bash command。

Claude Code 內建：

- Read
- Grep
- Glob

可能不會經過 RTK 壓縮。

因此在大量分析時，優先考慮：

```bash
rtk read
rtk grep
rtk find
```

不要為了方便把幾十萬字元的完整檔案塞進 context。

### 原則

先：

STRUCTURE

再：

SEARCH

再：

TARGETED READ

不要：

FULL DUMP

---

## 5. 測試輸出也必須節省 Token

測試優先：

```bash
rtk test npm test
```

Browser test：

```bash
rtk test npm run test:browser
```

或者使用適合目前 RTK 版本的 compact wrapper。

如果 test failure 時 RTK 回傳類似：

```text
[full output: rtk recall XXXXX]
```

先用：

```bash
rtk recall XXXXX
```

查真正必要的完整輸出。

不要立刻重新執行一遍 raw test，把幾千行 log 又塞進 context。

工作結束時執行：

```bash
rtk gain
```

告訴我這次 session RTK 大約減少多少 shell output。

---

## 6. ROM REFERENCE 的研究規則

我不是要你「破解並移植」參考遊戲。

我要的是：

**Clean-Room Design Analysis**

允許研究：

- 外部可觀察 gameplay
- 操控反應
- 鏡頭反應
- 道路節奏
- 視覺構圖
- 速度感
- 景深
- 物件縮放感
- foreground / midground / background layering
- traffic readability
- stage pacing
- difficulty pacing
- collision feedback
- crash recovery pacing
- UI information hierarchy
- HUD readability
- checkpoint feedback
- stage transitions
- control immediacy
- sense of inertia
- visual rhythm
- audio feedback類型
- attract-mode philosophy
- arcade cabinet presentation philosophy
- risk / reward philosophy
- replayability philosophy

禁止：

- 1:1 source translation
- decompilation
- disassembly
- opcode → function mapping
- exact handling table extraction
- exact camera table extraction
- exact animation timing table extraction
- sprite extraction
- tile extraction
- palette extraction
- font extraction
- music extraction
- PCM extraction
- sound extraction
- car artwork extraction
- logo extraction
- HUD extraction
- route-map extraction
- proprietary game code移植
- exact source-specific mechanic replication
- distinctive licensed identity複製
- exact UI composition複製

如果可以合法在本機 emulator 中運行我提供的 reference ROM，可以把它當成：

**black-box observable reference**

進行 gameplay / frame / presentation 研究。

但是：

不要從 ROM 內部抽出資產。

不要去下載其他 ROM。

不要把 reference screenshot 當成 shipping asset。

研究截圖只允許放在 temporary research directory。

不得 commit。

---

## 7. 最重要的產品哲學

我的遊戲不是：

「OutRunners browser remake」

也不是：

「SEGA style clone」

我的遊戲是：

# TAIPEI SUNSET DRIVE

一款具有：

**1990s large-cabinet arcade racing energy**

的：

**Taipei / New Taipei arcade road game**

---

## 8. 台北元素為不可破壞資產

以下是最高優先級規則。

任何修改，只要破壞這些原則，就必須 REJECT 或 REVERT。

### 台北身份不可被降低

不可以把：

- 台北
- 新北
- 台灣道路
- 台灣街景
- 中文招牌
- 在地道路設施
- 山
- 水岸
- 高架
- 街屋
- 地標
- 都市密度
- 台北盆地感
- 濕度與空氣感
- 夕陽
- 夜間城市
- 台灣交通語彙

變成：

- Generic Cyberpunk City
- Generic Synthwave City
- Miami
- California
- Japan
- Hong Kong
- generic neon metropolis
- generic American highway
- generic tropical road

### 街機化 ≠ 泛用霓虹化

不要因為「Retro Arcade」就到處：

- 紫色
- 粉紅色
- 螢光藍
- scanline
- chromatic aberration
- VHS
- excessive bloom

這些不是街機感的本質。

真正的街機感應該來自：

- 構圖
- 高速物件流動
- 視距
- 景深
- 操控回饋
- 道路 rhythm
- 道路曲率
- foreground cadence
- UI hierarchy
- strong gameplay feedback
- readable danger
- strong acceleration contrast
- strong stage identity
- exaggerated but readable motion

---

## 9. 目前 15 條路線身份必須保護

請先從實際 code / docs 驗證目前 route definition。

目前已知 V51 reality model 約為：

### 1A

台北 civic core

Ketagalan Boulevard / Presidential Office / Jingfu Gate

real-anchor

### 2A

Zhongshan North Road → Yuanshan / Jiantan

Grand Hotel 為 hillside visual anchor

real-corridor

### 2B

Civic Boulevard elevated corridor / Guanghua

real-corridor

### 3A

Beitou Thermal Valley / Guandu waterfront

compressed-link

### 3B

Miramar / Dazhi / National Palace Museum

compressed-link

### 3C

Taipei Dome / Songshan Cultural and Creative Park

real-anchor

### 4A

Tamsui Old Street / Golden Riverside / Fort San Domingo

real-corridor

### 4B

Xiaoyoukeng / Qingtiangang / Yangmingshan

compressed-link

### 4C

Neihu Tech Park / Raohe / Keelung River

compressed-link

Rainbow Bridge：

**只能是 visual landmark。**

不能變成汽車道路。

### 4D

44 South Village / Taipei 101 / Xinyi

real-anchor

### 5A

Fisherman's Wharf / Lover's Bridge / Danjiang Bridge

real-corridor / landmark relationship

### 5B

Fugui Cape Lighthouse

real-anchor

### 5C

Jiufen / Amei Teahouse

real-anchor

### 5D

Taipei 101 / Xinyi finish

real-anchor

finish geometry 可以 game-fictionalized。

### 5E

Maokong / Tea Area / Gondola

compressed-link

Maokong Gondola：

**只能是 visual landmark。**

不能被當成可開車道路。

---

## 10. 地標保護

至少重新確認目前所有 landmark implementation。

包括但不限於：

- Taipei 101
- Grand Hotel Taipei
- Guandu Bridge
- Taipei Dome
- Fugui Cape Lighthouse
- Amei Teahouse
- Maokong Gondola
- Presidential Office
- Jingfu Gate
- Taipei urban skyline
- Tamsui waterfront
- Fisherman's Wharf
- Yangmingshan
- Beitou
- Songshan / Xinyi
- Neihu
- Jiufen

可以：

- 增加 silhouette accuracy
- 增加 volume
- 增加 side face
- 增加 depth
- 增加 skyline relationship
- 增加 atmospheric perspective
- 增加 contextual staging
- 改進 scale
- 改進 lighting
- 改進 framing

不可以：

- 刪掉
- 用 generic building 取代
- 因為參考遊戲沒有就移除
- 把地標改成別的城市建築
- 為了高速感讓地標完全不真實
- 用外部遊戲 sprite 取代

---

## 11. 先分析，再動手

不要一拿到專案就開始亂改數字。

第一階段必須建立：

# CURRENT GAME BASELINE

分析現在遊戲「已經做對什麼」。

我要的是：

**KEEP THE GOOD, FIX THE WEAK.**

不是：

**REWRITE EVERYTHING.**

---

## 12. CURRENT GAME BASELINE AUDIT

請完整評估：

### Gameplay

- throttle response
- acceleration
- top speed progression
- steering response
- high-speed steering authority
- low-speed steering authority
- lift-off behavior
- braking
- gear behavior
- LOW / HIGH identity
- AT
- MT
- drift entry
- drift sustain
- drift angle
- visual drift angle
- physical drift path
- countersteer
- drift recovery
- road-edge recovery
- nitro charge
- nitro storage
- nitro activation
- nitro acceleration
- nitro duration
- nitro visual punch
- boost while drifting
- drift charge while boosting
- Moment Boost
- collisions
- traffic collision fairness
- barrier collision fairness
- crash penalty
- crash recovery
- off-road behavior
- route branching
- checkpoints
- timers
- difficulty
- player learning curve
- route mastery
- replayability
- Sprint
- Cruise
- Arcade
- Twin Link

---

## 13. GAME FEEL AUDIT

評估玩家在：

0–3 秒

3–10 秒

10–30 秒

30–90 秒

完整一條路線

完整 Arcade run

分別感受到什麼。

特別找：

- 無聊區
- 操控延遲感
- 速度不明顯
- 甩尾無感
- Nitro 不夠爽
- Nitro 太誇張
- 車子像在漂浮
- 道路像輸送帶
- 車輛與道路沒有重量關係
- 玩家看不懂何時要轉
- 彎道預告不足
- speed sensation 靠 camera shake 而不是世界運動
- crash 太頻繁
- crash 不公平
- traffic 看不到卻會撞
- 道路兩側物件沒有 rhythm
- 長直線沒有玩法
- 小彎、大彎沒有操作差異
- route 不同但玩起來一樣

---

## 14. REFERENCE ARCADE ANALYSIS

對 reference game 做完整但 Clean-Room 的外部設計研究。

不要只說：

「它很有街機感。」

我要拆解「為什麼」。

至少分析：

### Speed Perception

研究：

- horizon placement
- road narrowing
- foreground passing speed
- lane marker cadence
- roadside prop cadence
- sprite/object scale growth
- skyline movement
- background parallax
- near-object parallax
- road texture rhythm
- curve visibility
- hill visibility
- visual acceleration
- boost-like moments
- FOV feeling
- camera stability

問：

> 它的速度感到底有多少來自真正速度，多少來自畫面設計？

---

## 15. CONTROL LANGUAGE

研究：

- input → response latency
- steering immediacy
- centering
- low-speed authority
- high-speed authority
- turn initiation
- mid-corner correction
- road correction
- error recovery
- collision recovery

不要抄參數。

把它轉成抽象描述，例如：

BAD：

`steering = exact_reference_value`

GOOD：

「中速 turn-in 必須很快讓玩家知道輸入已經成功，但高速時逐漸降低 lateral authority，保留可修線空間。」

---

## 16. ROAD RHYTHM

分析：

- straight length
- shallow curve length
- medium curve length
- hard curve frequency
- S curve
- hill
- crest
- downhill
- narrowing
- lane change opportunity
- traffic encounter spacing
- landmark encounter spacing
- visual rest areas
- challenge peaks
- recovery sections

我要知道：

為什麼一段路會：

「一直想繼續開」

而不是：

「只是 road segments 在往後移。」

---

## 17. CAMERA

分析：

- vertical position
- horizon
- pitch
- yaw
- lateral tracking
- steering camera response
- drift camera response
- crash camera
- acceleration reaction
- high-speed reaction
- shake
- vibration
- FOV-like presentation

但請記住：

我的 V50 / V51 已經有降低 3D motion sickness 的設計。

所以：

**速度感優先靠世界，不是靠晃鏡頭。**

如果 reference 的 camera movement 很強：

不要直接照搬。

找出：

它想傳達的感覺

然後用：

- roadside speed
- stable parallax
- road-light rhythm
- perspective
- near object cadence
- subtle chassis movement

重做。

---

## 18. TRAFFIC

研究：

- density
- spawn distance
- lane placement
- speed differential
- overtaking
- predictability
- reaction time
- visual size
- warning readability
- collision fairness
- recovery

我的原則：

**如果玩家撞到東西，玩家必須有機會知道自己為什麼撞。**

禁止重新引入：

- invisible collider
- phantom traffic
- off-screen collision
- unreadable road-edge collision

---

## 19. DRIFT

我的 Drift 不應變成任何外部遊戲的招牌機制複製。

分析的是：

- turn-in satisfaction
- car attitude
- visual yaw
- physical lateral travel
- countersteer
- line correction
- recovery
- entry readability
- sustained control
- reward
- error cost

目前專案已經有：

physics yaw

與：

presentation yaw

分離。

這個設計原則必須保留。

### 重要

車可以看起來很側。

但：

不代表物理上必須往牆壁滑。

Shallow bend：

較小 visual yaw

較小 physical path drift

Tight bend：

可以有更大的 sideways presentation

但仍必須：

PLAYER CONTROL FIRST.

---

## 20. NITRO

分析：

為什麼一個 arcade boost 會讓人爽。

拆成：

- immediate impulse
- sustained acceleration
- audio transient
- pitch increase
- road flow increase
- camera punch
- HUD response
- tail / glow
- speed-line response
- traffic closing speed
- top-speed separation
- post-boost recovery

不要只是：

「把 acceleration 乘 1.5。」

Nitro 必須和 normal acceleration：

**感覺完全不同。**

但不能變成：

看不清道路。

---

## 21. ARCADE VISUAL DEPTH

研究 reference 的：

BACKGROUND

MIDGROUND

ROAD LAYER

ROADSIDE

FOREGROUND

PLAYER

HUD

之間如何分層。

然後回答：

目前 Taipei Sunset Drive：

哪一層：

- 太空
- 太平
- 太密
- 太亂
- 太近
- 太遠
- scale 不對
- contrast 不對
- color 不對
- movement 不對

---

## 22. TAIPEI VISUAL TARGET

我要的不是：

Photorealistic Taipei

也不是：

Pixel-art Taipei

更不是：

Cyberpunk Taipei

我要：

# ARCADE TAIPEI

也就是：

真實台北的辨識度

＋

大型街機賽車的視覺誇張

例如：

真實台北：

- 街屋
- 山
- 水
- 高架
- 河岸
- 101
- Grand Hotel
- 招牌
- 路燈
- 橋梁
- 都市密度

街機化：

- silhouette 更乾淨
- landmark scale 稍微戲劇化
- atmospheric depth 更明顯
- foreground movement 更強
- color separation 更好
- stage color identity 更清楚
- road edge 更好讀
- traffic contrast 更清楚
- prop rhythm 更強

---

## 23. 不允許只靠「加東西」

優化不一定是增加。

你也必須找：

什麼東西應該刪。

例如：

- 重複 foreground layer
- 過量 speed line
- 過量 building
- 過量 bloom
- 過量 sign
- 過量 UI
- 多餘 shake
- 多餘 ghost
- 過強 color filter
- 路邊視覺噪音
- 遮住道路的 landmark

原則：

**ARCADE READABILITY > VISUAL NOISE**

---

## 24. UI / HUD

分析目前：

- Speed
- Gear
- RPM
- Timer
- Nitro
- Drift charge
- Boost state
- Route
- Checkpoint
- Position
- Pause
- Radio
- Atlas
- Garage
- Touch controls

注意：

不可以直接模仿 reference game distinctive HUD。

我要：

**原創 Taipei arcade HUD**

可以吸收：

- readability
- hierarchy
- urgency
- glance speed
- animation feedback

不能吸收：

- exact layout
- exact typography
- exact route map
- exact icon
- exact color arrangement
- branded visual identity

---

## 25. AUDIO

目前遊戲有原創 Web Audio。

你可以優化：

- engine layers
- RPM pitch
- gear shift transient
- tire slip
- drift
- nitro ignition
- nitro sustain
- crash
- scrape
- roadside pass-by
- checkpoint
- menu select
- countdown
- result
- ambient city feeling

但：

不能提取 reference ROM 的：

- music
- PCM
- samples
- voices
- melodies

只研究：

「什麼時候需要聲音。」

不是：

「那個聲音本身。」

---

## 26. ARCADE PRESENTATION

研究：

- attract philosophy
- start cadence
- countdown
- stage introduction
- route transition
- checkpoint celebration
- final result
- score / time feedback
- high-score feeling
- retry loop

如果目前遊戲缺少 Arcade Cabinet Feel：

請建立：

**原創 Taipei arcade presentation。**

可以有：

- 大字
- 強節奏
- 中英雙語
- 台北地名
- 路線名稱
- start sequence
- checkpoint flash
- stage card
- finish sequence

但不要複製 reference title / UI。

---

## 27. GAP ANALYSIS MATRIX

完成 reference 與 current game 分析後，建立完整：

# REFERENCE → TAIPEI TRANSFER MATRIX

每一項至少包含：

| Dimension | Reference Strength | Current Taipei State | Deficiency | Transferable Principle | Taipei-specific Solution | Copy Risk | Regression Risk | Priority | Acceptance Metric |
|---|---|---|---|---|---|---|---|---|---|

Priority：

- P0 Critical
- P1 High
- P2 Medium
- P3 Polish

---

## 28. FUSION FILTER

任何想從 reference 吸收的優點，都必須通過下面四關。

### Gate 1 — FUN

真的會增加：

- fun
- control
- speed
- readability
- mastery
- reward

嗎？

如果沒有：

不要做。

### Gate 2 — ORIGINALITY

可以用：

獨立程式

獨立參數

獨立 artwork

獨立 UI

重做嗎？

如果必須直接複製：

不要做。

### Gate 3 — TAIPEI

會讓玩家更感覺：

「我在玩台北的街機賽車」

嗎？

如果會讓台北變弱：

不要做。

### Gate 4 — QUALITY

能保持：

- responsive
- readable
- comfortable
- performant
- testable
- mobile-safe

嗎？

不能：

不要做。

---

## 29. 對每項 reference feature 做 KEEP / ADAPT / REJECT

最後不要把所有 reference 優點全部塞進遊戲。

分類：

### KEEP EXISTING

我的系統目前更好，不改。

### ADAPT

reference 原理較好，但要 Taipei 化、獨立實作。

### REJECT

即使 reference 做得很好，也不適合我的遊戲。

例如可能因為：

- 會破壞 Taipei
- 過時
- 會造成暈眩
- 太像原作
- 不適合 browser
- 不適合 mobile
- 不適合目前玩法
- 會破壞 accessibility
- 沒有實際 gameplay benefit

---

## 30. IMPLEMENTATION 原則

完成分析後：

不要只交報告。

你要真的優化遊戲。

但是：

### 不准 Big-Bang Rewrite

採用：

SMALL

MEASURABLE

REVERSIBLE

TESTED

修改。

---

## 31. 建議工作順序

優先順序：

### PASS 1 — Gameplay feel

- acceleration
- steering
- braking
- drift
- recovery
- nitro
- traffic
- collision
- road-edge feel

### PASS 2 — Speed perception

- perspective
- road flow
- foreground rhythm
- parallax
- scale growth
- stable camera
- speed effects

### PASS 3 — Road / Stage rhythm

- curves
- hills
- challenge
- recovery
- traffic encounters
- landmark timing

### PASS 4 — Taipei visual depth

- skyline
- landmark framing
- architecture
- mountain
- water
- haze
- near/mid/far layers
- road infrastructure

### PASS 5 — HUD / Arcade feedback

- timer
- speed
- gear
- nitro
- drift
- checkpoint
- route identity
- start / finish

### PASS 6 — Audio feedback

只用原創 Web Audio。

### PASS 7 — Polish / optimization

- responsive
- mobile
- performance
- clipping
- readability

---

## 32. 不要亂動 Architecture

目前遊戲的：

single-file-ish shipping architecture

和：

offline/static ability

本身是優勢。

除非有非常明確的技術理由：

不要為了「工程漂亮」把整個遊戲拆成大型 framework。

不要加入：

- React
- Vue
- Three.js
- Phaser
- Unity WebGL
- large runtime dependencies

除非沒有其他方法。

現在的技術方向：

Canvas + JS + static HTML

應視為產品特性。

---

## 33. PERFORMANCE

所有美術強化都必須考慮：

- desktop
- mid-range mobile
- portrait
- landscape

不要因為：

更漂亮

就加入：

大量 draw calls

大量 shadow blur

大量 alpha layers

大量粒子

大量 expensive per-frame allocation

如果可以：

建立簡單 rendering budget。

---

## 34. 原始台北內容不能被 reference 覆蓋

當：

REFERENCE

和：

TAIPEI

發生衝突：

永遠選：

TAIPEI。

例如：

如果 reference 道路旁是：

棕櫚樹

不能因為很有街機感就把台北變成棕櫚海岸。

應該尋找：

台灣適合的 equivalent：

- 路燈
- 樹
- 電線桿
- 反光柱
- 高架柱
- 河岸設施
- 山壁
- 便利商店式招牌語彙
- 街屋
- 市區燈箱
- 台灣護欄
- 公車
- 計程車
- 橋梁

保留：

**功能。**

更換：

**內容。**

---

## 35. 避免 Taipei Theme Park

台北不是把：

101

Grand Hotel

Amei Teahouse

Maokong Gondola

全部塞在一起。

每條 route 應該保留自己的：

GEOGRAPHICAL PERSONALITY。

不要為了「更有台北感」而：

每 20 秒一個知名地標。

真正好的 Taipei identity 包含：

普通街道

橋下

街屋

山坡

河岸

高架

住宅

商業區

天空

水氣

城市尺度

地標只是 punctuation。

不是全部內容。

---

## 36. 路線差異化

15 條 route 必須：

不只是名字不同。

至少從下列幾個 dimension 產生差別：

- curve rhythm
- road width
- elevation
- horizon
- architecture density
- water presence
- mountain presence
- traffic density
- lighting
- color palette
- landmark frequency
- roadside prop vocabulary
- visibility
- driving demand

但是：

不要因此讓 competitive fairness 完全失控。

---

## 37. 每條路線問自己

看到沒有 HUD 的 screenshot：

玩家有沒有合理機會知道：

「這條不像上一條。」

如果所有 route：

只是在換天空顏色＋換 landmark：

不夠。

---

## 38. 速度感的優先順序

如果速度感不足：

優先調整：

1. world flow
2. roadside cadence
3. road projection
4. object scale growth
5. lane / road detail motion
6. mid / near parallax
7. traffic relative velocity
8. audio
9. subtle camera response

最後才：

10. shake

不要反過來。

---

## 39. CAMERA COMFORT

保留目前降低 motion sickness 的方向。

不要重新引入：

- large lateral camera swing
- aggressive FOV pulse
- strong roll
- constant shake
- drift camera snap

速度感應該爽。

不是暈。

---

## 40. VERSIONING

修改前確認：

目前：

shipping build version

與：

competitive record version

如何管理。

如果只改：

- visual
- UI
- non-gameplay audio
- clipping bug

可以考慮：

patch version。

如果實質改變：

- handling
- acceleration
- top speed
- nitro
- drift
- collision
- route timing
- traffic difficulty
- timer
- stage length

舊排行榜時間可能已經不能公平比較。

這種情況：

建立新的 competitive version namespace。

不要默默讓舊紀錄和新 physics 混在一起。

---

## 41. TESTING 是功能的一部分

不要先改完全部才跑測試。

每一個主要 pass：

都應測試。

至少保留：

```bash
rtk test npm test
```

最終：

```bash
rtk test npm run test:browser
```

---

## 42. 不可以破壞既有 CLEAN-ROOM TEST

以下原則不得降低：

- no ROM asset
- no archive asset
- no external reference brand in shipping runtime
- no direct translation markers
- no retired unsafe rendering layers
- visible build version
- finite projections
- route identity
- landmark reality
- collision visibility
- mobile smoke
- Twin Link
- audio lifecycle

只可以：

增加 safeguards。

不可以：

為了讓你的改動過測試，把 guard 刪掉。

---

## 43. 建立新的 Regression Tests

如果你改：

steering

就新增：

steering regression。

如果你改：

speed curve

就新增：

speed regression。

如果你改：

traffic

就新增：

traffic fairness regression。

如果你改：

visual depth

就新增：

finite projection / clipping / screenshot regression。

如果你改：

HUD

就新增：

desktop / portrait / landscape UI smoke。

如果你改：

route identity

就新增：

15-route identity check。

---

## 44. SCREENSHOT QA

善用目前 Playwright screenshot infrastructure。

至少保留：

15 route screenshot。

如果你修改：

- drift
- boost
- traffic
- UI
- landmark
- road depth

新增對應 screenshot probe。

檢查：

- road clipping
- building clipping
- floating objects
- water building
- giant foreground
- disappearing car
- stretched vehicle
- overlapping signs
- text overflow
- HUD overflow
- mobile overflow
- road unreadability

---

## 45. BEFORE / AFTER

對重要修改建立：

BEFORE

與：

AFTER

比較。

不是只說：

「我改好了。」

每一個修改至少回答：

### Problem

原本哪裡不好？

### Cause

為什麼？

### Reference Insight

參考遊戲讓你學到什麼抽象原理？

### Taipei Adaptation

怎麼台北化？

### Implementation

你實際改了什麼？

### Measurement

怎麼知道真的變好？

### Regression Risk

可能破壞什麼？

---

## 46. 我特別希望你找到的缺失

請主動尋找，不限於：

### Gameplay

- 高速是不是其實很單調？
- Normal acceleration 是否缺乏階段感？
- Nitro 是否夠有反差？
- Drift 是否有技術深度？
- Grip driving 是否有存在價值？
- Brake 是否真的有策略？
- LOW / HIGH 是否真的有個性？
- MT 是否值得玩家使用？
- 交通車是不是只是一種障礙？
- 長直線有沒有 decision？
- 小彎和大彎是否真的不同？
- Crash 後是否太破壞 flow？
- Checkpoint 是否有情緒高點？
- Arcade 模式後段是否有 tension？
- 15 route 是否有 mastery difference？
- 玩家是否有理由重玩？

### Visual

- 地平線是不是過空？
- skyline 是否太平？
- roadside 是否太像 cardboard？
- 建築 scale 是否失衡？
- foreground 是否突然冒出？
- 中景是否不足？
- 山／水／城市是否真的有不同 depth？
- landmark 是否只是 billboard？
- traffic vehicle volume 是否足夠？
- player's car 是否真正有 volume？
- 車輛是否融進道路？
- shadow 是否足夠？
- road surface 是否太乾淨？
- lane / shoulder 是否足夠 readable？
- speed FX 是否太依靠線條？
- 夜景是否變成 generic neon？
- UI 是否太 web-game？
- Start / Finish 是否不夠 arcade？

---

## 47. ARCADE FUN TEST

每個功能都問：

> 如果我把 reference game 名稱完全拿掉，這個改動本身還會讓 Taipei Sunset Drive 更好玩嗎？

如果答案：

NO

不要加。

---

## 48. TAIPEI IDENTITY TEST

再問：

> 這個修改是在讓玩家更想看台北，還是在讓玩家只注意「很像某款舊街機」？

如果後者：

REJECT。

---

## 49. 不要追求 CLONE ACCURACY

不要建立：

「Reference similarity 95%」

我要的 KPI 是：

- Arcade Feel
- Taipei Identity
- Driving Fun
- Readability
- Replayability
- Originality
- Stability

不是：

Similarity。

---

## 50. 建議 Scorecard

修改前和修改後都給 1–10：

- Initial Fun
- Control Response
- Steering Feel
- Drift Feel
- Grip Driving
- Nitro Satisfaction
- Speed Perception
- Road Rhythm
- Traffic Fairness
- Collision Fairness
- Stage Variety
- Route Identity
- Taipei Identity
- Landmark Quality
- Visual Depth
- Arcade Feel
- HUD Readability
- Audio Feedback
- Mobile Experience
- Comfort
- Performance
- Replayability

分數必須附理由。

不要亂給 10/10。

---

## 51. IMPLEMENTATION PRIORITY

優先改善：

### P0

任何：

- bug
- unfair collision
- broken input
- unreadable road
- visual clipping
- major gameplay weakness
- route identity regression
- Taipei identity regression

### P1

- speed
- steering
- drift
- boost
- stage pacing
- depth
- visual rhythm

### P2

- UI
- audio
- polish
- transitions
- minor art improvement

### P3

純裝飾。

---

## 52. 不要被「更多效果」騙

如果一個改動：

只是 screenshot 比較華麗

但是 driving：

沒有更爽

甚至更難看道路：

就不是 improvement。

---

## 53. Git 工作方式

如果 repository 允許：

建立獨立 branch，例如：

```bash
git checkout -b claude/arcade-taipei-evolution
```

但：

不要 push

除非明確有權限且任務要求。

使用：

```bash
rtk git status
rtk git diff
```

持續檢查。

---

## 54. 禁止 reference ROM 進 Git

在任何 commit 前：

確認：

```bash
rtk git status
```

不能出現：

- orunners.zip
- ROM files
- screenshots from reference
- extracted assets
- analysis dump containing binary data

Reference material 必須留在：

repo 外。

---

## 55. DOCUMENTATION

建立新的開發文件，例如：

`docs/V52_Arcade_Taipei_Evolution.md`

實際版本號請依最終修改內容決定。

內容記錄：

- original baseline
- reference insights
- rejected ideas
- adopted principles
- Taipei protections
- gameplay changes
- visual changes
- test changes
- versioning
- remaining issues

---

## 56. 特別記錄 REJECTED IDEAS

我要你記錄：

reference 哪些地方很好，

但：

你刻意沒有採用。

原因可能是：

- 太 source-specific
- 破壞 Taipei
- motion sickness
- browser performance
- mobile usability
- legal / clean-room
- current design already better
- unnecessary

這非常重要。

因為：

**成熟設計不是什麼都加。**

---

## 57. 如果 Reference 分析能力有限

如果目前執行環境無法：

- 啟動 emulator
- 取得 gameplay frames
- 查看影片
- 進行互動

不要因此假裝你已經觀察過。

明確區分：

OBSERVED

INFERRED

NOT VERIFIED

不要 hallucinate。

你仍然可以：

完整分析我的遊戲，

並建立之後可補驗的 reference hypothesis。

---

## 58. 不允許假裝「ROM 分析很完整」

光看到 ROM filenames：

不等於理解 gameplay。

光看到 binary entropy：

不等於理解 rendering。

光看到 program ROM：

不等於理解 handling。

所有結論要標記 evidence type。

---

## 59. 自主工作

不要每做一步就問我：

「要不要繼續？」

這個任務已經授權你：

分析

→ 規劃

→ 修改

→ 測試

→ 修正

→ 驗收。

除非遇到：

- repository 無法取得
- destructive operation
- credentials
- 不可逆外部 action

否則：

自行做出工程判斷並繼續。

---

## 60. 不要停在 Plan

這一點非常重要。

你的工作不是最後只給我：

「建議可以這樣改。」

我要：

1. 分析
2. 找缺點
3. 做決策
4. 改 code
5. 改 tests
6. 跑 tests
7. browser QA
8. 比較 before / after
9. 修 regression
10. 最終報告

---

## 61. CHANGE DISCIPLINE

不要一次調 30 個 handling constant 然後不知道哪個造成結果。

每一組修改要有：

hypothesis。

例如：

> 「250 km/h 以上 steering authority 太弱，所以玩家沒有修線能力。」

然後：

修改最小範圍。

測試。

驗證。

---

## 62. 可以保留「不完美」

不要把所有東西都 smooth 掉。

街機賽車需要：

- aggression
- punch
- rhythm
- surprise
- contrast

我不要：

完全平滑

完全安全

完全 simulation

完全 cinematic

我要：

CONTROLLED EXAGGERATION。

---

## 63. 玩家永遠要覺得自己在控制車

視覺可以誇張。

但：

player agency

不能被拿走。

禁止讓：

camera

drift helper

auto steering

road magnet

強行把玩家帶進：

預定動畫。

---

## 64. 不要增加 AUTO-RAIL DRIFT

目前 Clean-Room 已經特別避免：

auto-rail drift。

繼續保持。

玩家可以得到：

assist

但不能得到：

scripted line。

---

## 65. 成功標準

最終版本應讓第一次看到的人覺得：

> 「這是一款很像真正大型街機會出現的高速賽車。」

但玩幾秒後又立刻知道：

> 「這就是台北。」

不是：

> 「這是哪款舊遊戲的 browser clone？」

---

## 66. FINAL ACCEPTANCE

最終修改至少達到：

### Taipei

- 15 route identity preserved
- landmarks preserved or improved
- geography guard preserved
- no generic-city replacement
- no visual-only landmark turned into road

### Gameplay

- steering readable
- drift controllable
- grip viable
- nitro dramatic
- traffic fair
- collision explainable
- crash recovery acceptable
- routes meaningfully differentiated

### Visual

- road readable at speed
- stronger near/mid/far depth
- stronger object cadence
- landmark staging improved
- clipping controlled
- no motion-sickness regression

### Engineering

- static browser game still works
- no unnecessary framework
- no reference binary assets
- clean-room passes
- regression passes
- browser tests pass
- desktop passes
- portrait passes
- landscape passes

---

## 67. FINAL TEST COMMANDS

最終至少執行：

```bash
rtk git status
rtk test npm test
rtk test npm run test:browser
rtk git diff
rtk gain
```

如果因環境差異必須使用不同 wrapper：

可以調整。

但：

必須保留 compact-output 原則。

---

## 68. 最終交付格式

完成工作後，給我一份結構化最終報告。

順序：

### 1. Executive Summary

最重要的問題。

最重要的改善。

### 2. What Was Already Good

明確指出原本已經做對的地方。

不要為了顯示你有工作而全部重做。

### 3. Reference Arcade Strengths

只談可轉移的設計原理。

### 4. Current Game Weaknesses

Gameplay。

Visual。

UI。

Audio。

Pacing。

### 5. KEEP / ADAPT / REJECT Matrix

哪些保留。

哪些融合。

哪些拒絕。

以及原因。

### 6. Taipei Identity Protection

說明你如何確保：

台北只有變強。

沒有被 reference 覆蓋。

### 7. Gameplay Changes

每項列：

Problem

Before

After

Reason

Metric

### 8. Visual Changes

每項列：

Problem

Before

After

Taipei benefit

### 9. Files Changed

列出真正修改的檔案。

### 10. Tests Added / Updated

列出。

### 11. Test Results

- Clean-Room
- Regression
- Browser
- Desktop
- Portrait
- Landscape
- Runtime errors
- Route screenshots

### 12. Versioning Decision

說明：

為什麼是 patch version

或：

為什麼必須 competitive version bump。

### 13. Remaining Weaknesses

不要說：

「一切完美。」

告訴我下一步最值得改善什麼。

### 14. RTK Token Savings

提供：

```bash
rtk gain
```

摘要。

---

## 69. 最後再確認一次最高規則

REFERENCE GAME：

是老師。

不是模板。

ROM：

是研究參考。

不是素材庫。

ARCADE：

是設計語言。

TAIPEI：

才是世界。

所以你的最終決策規則永遠是：

# ONLY TAKE THE STRENGTHS.

# DO NOT TAKE THE IDENTITY.

# DO NOT COPY THE CONTENT.

# DO NOT BREAK TAIPEI.

# MAKE TAIPEI STRONGER.

最終目標：

> **把 Taipei Sunset Drive 做成一款即使完全移除所有外部遊戲名稱，人們仍然會認為它是一款成熟、有速度、有重量、有節奏、有大型機氣勢，而且只有台北才能成立的原創街機賽車。**

現在開始。

先使用 RTK 建立 repository map。

先理解。

再比較。

再找缺失。

最後才修改。

不要跳步。
