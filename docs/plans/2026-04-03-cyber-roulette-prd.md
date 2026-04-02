# CyberRoulette: Legacy Pot - Product Requirements Document

> Version: 1.0
> Date: 2026-04-03
> Status: Draft

---

## 1. Product Overview

### 1.1 What Is This

CyberRoulette 是一款基於區塊鏈的「遞減格數接力輪盤」遊戲。玩家使用 USDC 下注，
遊戲採用單 0 輪盤（37 格），每次未中獎時格數減少一格，勝率逐步提高。
玩家可放棄或接手他人的輪盤，形成「搶尾刀」的社交競爭機制。

### 1.2 Core Value Proposition

- **遞減格數**：格數從 36 遞減至 1，製造「離中獎越來越近」的心理張力
- **遺產池 (Legacy Pot)**：累積獎金隨格數減少而解鎖更多，製造 FOMO
- **接力機制**：放棄的輪盤可被他人搶位，產生社交競爭和觀戰樂趣
- **區塊鏈透明**：智能合約保證公平，所有數據鏈上可查

### 1.3 Target Market

- 亞洲市場為主（台灣、東南亞、日韓）
- 已有加密錢包的 Web3 玩家
- 年齡層 20-40 歲，對數位科技感興趣

### 1.4 Platform

- PWA 網站（Progressive Web App）
- 部署鏈：Base (Coinbase L2)
- 支付代幣：USDC (ERC-20)

---

## 2. Game Rules - 遞減格數接力版

### 2.1 Basic Setup

| 項目 | 規格 |
|------|------|
| 輪盤格數 | 36 個數字格 + 1 個「0」格 = 37 格 |
| 0 的角色 | 永遠不消失，作為莊家優勢來源（System Wipe） |
| 下注方式 | 一次只能選一個數字 |
| 下注貨幣 | USDC |
| 隨機數來源 | Chainlink VRF（可驗證公平） |

### 2.2 Game Flow

```
玩家選一個數字下注 USDC
        │
        ▼
  Chainlink VRF 產生隨機數
        │
        ├── 中獎（選中的數字）
        │   → 獲得 下注額 x 賠率
        │   → 按比例領取遺產池
        │   → 輪盤重置為 36 格
        │
        ├── 落入「0」（System Wipe）
        │   → 下注金額 100% 沒收
        │   → 50% 進入遺產池
        │   → 50% 進入平台錢包
        │   → 格數不變（0 不消失）
        │
        └── 未中獎（其他數字格）
            → 該號碼從輪盤移除
            → 格數減 1（36 → 35 → 34...）
            → 資金按比例分帳（見 Section 3）
            → 等待下一注
```

### 2.3 Player Relay (接力機制)

- 當前玩家可隨時**放棄**當前輪盤
- 放棄後有 **30 秒**搶位倒數
- 30 秒內任何人可搶位接手（先到先得）
- 訂閱 L3 的玩家有**優先搶位權**（前 5 秒獨佔）
- 搶位成功後，繼承當前格數和遺產池狀態

### 2.4 Liquidation (清算機制)

| 剩餘格數 | 無人下注後的倒數 |
|---------|---------------|
| 36 ~ 20 格 | 48 小時 |
| 19 ~ 10 格 | 12 小時 |
| 9 ~ 2 格 | 1 小時（每有人下注重置為 5 分鐘） |
| 1 格 | 15 分鐘 |

**倒數歸零時：**
- 儲備池 50% → 平台歸檔
- 儲備池 50% → 注入全服最熱門桌的遺產池
- 遺產池保留，隨儲備金一起轉移
- 輪盤重置為 36 格，全服廣播「遺產轉移事件」

---

## 3. Financial Model - 資金流向

### 3.1 Odds Table (賠率表)

賠率固定為 `1 : N`（N = 當前剩餘數字格數），數學上完全公平。
平台優勢來自「0」的存在。

| 剩餘數字格 | 實際總格數(含 0) | 中獎率 | 顯示賠率 | 平台優勢(來自 0) |
|-----------|---------------|--------|---------|---------------|
| 36 | 37 | 2.70% | 1:35 | 2.7% |
| 18 | 19 | 5.26% | 1:17 | 5.3% |
| 10 | 11 | 9.09% | 1:9 | 9.1% |
| 5 | 6 | 16.6% | 1:4 | 16.7% |
| 2 | 3 | 33.3% | 1:1 | 33.3% |
| 1 | 2 | 50.0% | 1:0 (退本金) | 50.0% |

> Note: 最後 1 格時，中獎只退本金，但可領取整個遺產池，這就是為什麼 1:0 也有人搶。

### 3.2 Fund Split (每筆未中獎下注的分帳)

```
下注金額 100%
    │
    ├── 80% → Payout Reserve (儲備池)
    │         用於賠付未來的中獎者
    │
    ├── 15% → Legacy Pot (遺產池)
    │         累積大獎，按格數比例解鎖
    │
    └── 5%  → Platform Wallet (平台錢包)
              平台淨利潤
```

### 3.3 When Ball Lands on 0 (System Wipe)

```
下注金額 100% 沒收
    │
    ├── 50% → Legacy Pot (遺產池加碼)
    │
    └── 50% → Platform Wallet (平台利潤)
```

### 3.4 When Player Wins (中獎賠付)

```
中獎獎金 = (下注額 x 剩餘數字格數) + Pot 份額

Pot 份額 = Total_Pot x (36 - Current_Slots) / 36

例：
  - 36 格中獎 → Pot 的 0%（剛開局沒累積）
  - 18 格中獎 → Pot 的 50%
  -  5 格中獎 → Pot 的 86.1%
  -  1 格中獎 → Pot 的 97.2%

扣除：
  - 總獎金的 5% 作為系統維護費（Platform Fee）
  - 剩餘 Pot 餘額滾入下一輪
```

### 3.5 Dynamic Bet Limits (動態限額)

```
Max Bet = (Contract Balance x 0.8) / Current Slots

確保：合約餘額永遠能賠付最高賠率
```

### 3.6 Initial Funding (啟動資金)

- 平台需預存底池資金到合約（建議 $10,000 USDC）
- 用於應對早期中獎賠付
- 隨著玩家增加，儲備池自動增厚

---

## 4. Revenue Model - 營收模式

### 4.1 Revenue Streams

| 來源 | 說明 | 預估佔比 |
|------|------|---------|
| 基礎抽水 5% | 每筆未中獎下注的 5% | 40% |
| 0 號通殺 | 球落 0 時的 50% | 25% |
| 訂閱服務 | 尾刀警報月費 | 20% |
| 清算分成 | 倒數歸零時的 50% 儲備金 | 10% |
| 中獎手續費 | 中獎時獎金的 5% | 5% |

### 4.2 Subscription Tiers (訂閱等級)

| 等級 | 月費 | 功能 |
|------|------|------|
| L1 免費獵人 | $0 | 大廳看板（5-10s 延遲） |
| L2 專業獵人 | $9.9/月 | Telegram 即時警報（10 格以下）+ WebSocket 即時同步 |
| L3 頂級掠奪者 | $29.9/月 | Telegram 極速警報（5 格以下）+ 優先搶位權（5 秒） + 快速下注連結 |

> 訂閱費用以 USDC 支付，自動續費由智能合約處理

---

## 5. Lobby System - 大廳系統

### 5.1 Table Status Display

每個輪盤在大廳顯示：
- 剩餘格數（數字 + 視覺進度條）
- 遺產池金額
- 當前玩家地址（前 4 後 4）
- 當前玩家剩餘籌碼
- 清算倒數計時
- 觀戰人數

### 5.2 Heat Level (熱度分級)

| 等級 | 格數範圍 | 顏色 | 標籤 |
|------|---------|------|------|
| Cold | 36-25 格 | 綠色 | IDLE |
| Warm | 24-11 格 | 黃色 | HEATING |
| Hot | 10-6 格 | 橘色 | HOT ZONE |
| Critical | 5-1 格 | 紅色閃爍 | CRITICAL - HUNT MODE |

### 5.3 Alerts

- 10 格以下：大廳跑馬燈廣播
- 5 格以下：全服 Telegram 推播（L2+）
- 玩家放棄/搶位：即時通知觀戰者

---

## 6. Visual Design - 視覺風格

### 6.1 Style: Cyberpunk / Dark Tech

- **色調**：深黑底 + 霓虹藍/紫/橘 accent
- **字體**：等寬科技風（如 JetBrains Mono, Orbitron）
- **輪盤**：格數消失時以「數位解構」動效呈現
- **0 號**：命名為 "SYSTEM WIPE"，視覺上為紅色危險格
- **遺產池**：顯示為跳動的「能量球」，金額越大越不穩定
- **搶位**：空位出現時顯示 "SYSTEM BREACH - SLOT OPEN"

### 6.2 Sound Design

- 格數 > 20：平靜電子音
- 格數 10-20：節奏加快
- 格數 < 10：緊張心跳聲 + 警報音效
- 落入 0：全螢幕紅光 + 系統崩潰音效
- 中獎：霓虹爆炸特效 + 勝利音效

### 6.3 Transparency Panel (機率監控面板)

永久顯示在畫面側邊：
```
PROBABILITY MONITOR
├── Current Win Rate: 1/(N+1)
├── Payout Rate: 1:N
├── Legacy Pot: $XX,XXX USDC
├── Pot Unlock %: XX%
├── System Tax: 5%
├── Reserve Health: ████████░░ 80%
└── Time to Purge: HH:MM:SS
```

---

## 7. Smart Contract Specification

### 7.1 Contract: CyberRoulette.sol

**State Variables:**
```solidity
address public owner;
IERC20 public usdc;
uint256 public currentSlots;        // 1-36
uint256 public legacyPot;           // USDC in legacy pot
uint256 public lastBetTimestamp;     // for liquidation timer
address public currentPlayer;       // who holds the seat
uint256 public constant MAX_SLOTS = 36;
uint256 public constant PLATFORM_FEE = 5;  // 5%
```

**Key Functions:**
```
placeBet(uint256 betNumber, uint256 amount)
  - Requires USDC approval
  - Validates betNumber in range [1, currentSlots]
  - Validates amount <= maxBet()
  - Requests Chainlink VRF random number
  - Callback processes result (win/lose/zero)

abandonSeat()
  - Current player gives up
  - Starts 30s countdown for relay

claimSeat()
  - New player takes over abandoned seat
  - L3 subscribers get priority in first 5s

maxBet() view returns (uint256)
  - Returns (contractBalance * 80) / (currentSlots * 100)

rebalance()
  - Callable when liquidation timer expired
  - Splits reserve 50/50 (platform + hottest table)
  - Resets table to 36 slots
```

### 7.2 Contract: LegacyPot.sol

**Key Functions:**
```
deposit(uint256 amount)
  - Called by CyberRoulette on losing bets
  - Adds to pot balance

calculatePotShare(uint256 slotsRemaining) view returns (uint256)
  - Returns totalPot * (MAX_SLOTS - slotsRemaining) / MAX_SLOTS

withdraw(address winner, uint256 slotsRemaining)
  - Calculates pot share
  - Deducts 5% platform fee
  - Transfers to winner
  - Remaining pot rolls over
```

### 7.3 Randomness: Chainlink VRF v2.5

- 合約繼承 `VRFConsumerBaseV2Plus`
- 每次下注時 `requestRandomWords()`
- Callback `fulfillRandomWords()` 中處理開獎邏輯
- 隨機數結果 + 加密證明鏈上可查

### 7.4 Security Considerations

- **Reentrancy Guard**: 所有外部轉帳使用 ReentrancyGuard
- **Dynamic Max Bet**: 防止儲備池爆倉
- **Access Control**: owner 只能提取 platform fee，無法動用儲備池和遺產池
- **Pause Mechanism**: 緊急情況可暫停合約
- **Upgrade Pattern**: 使用 UUPS Proxy 支援合約升級

---

## 8. Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Base (Coinbase L2) |
| Smart Contract | Solidity 0.8.x + Foundry |
| Randomness | Chainlink VRF v2.5 |
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Wallet | RainbowKit + wagmi v2 |
| Animation | Framer Motion + Three.js (輪盤 3D) |
| PWA | next-pwa |
| Backend | Node.js + Fastify + TypeScript |
| Database | PostgreSQL (用戶/訂閱) |
| Realtime | WebSocket (Socket.io) |
| Notification | Telegram Bot API |
| Hosting | Vercel (frontend) + Railway (backend) |
| Monitoring | The Graph (鏈上數據索引) |

---

## 9. Multi-Table Architecture

### 9.1 Table Management

- 系統同時運行多個輪盤（初期 5-10 桌）
- 每個輪盤是獨立的智能合約實例（或用 Factory Pattern）
- 大廳負責聚合所有桌的狀態

### 9.2 Table Merging (合體機制)

- 當多個桌倒數歸零且無人參與
- 遺產池合併到最熱門的桌
- 全服廣播：「X 號桌吸收了 3 張廢桌的遺產！Pot 翻倍！」

---

## 10. Launch Strategy

### Phase 0: Pre-launch
- 合約部署到 Base Sepolia 測試網
- 邀請 50 名 Beta 測試者（免費 USDC 測試）
- 收集回饋、調整數值

### Phase 1: Soft Launch
- 主網上線，初始底池 $10,000 USDC
- 每日官方「種子遺產金」活動（固定時間注入 $500 到某桌 Pot）
- 全服廣播吸引首批玩家

### Phase 2: Growth
- 開放訂閱服務
- Telegram 社群 + Discord
- KOL 合作推廣
- 引入「尾刀王」排行榜

### Phase 3: Scale
- 擴展桌數
- 開放 API（機器人可接入）
- DAO 治理（代幣持有者投票決定 Pot 比例）

---

## 11. Legal Considerations

- 部署在去中心化區塊鏈上，無中心化伺服器直接處理資金
- 智能合約開源，任何人可驗證公平性
- 不儲存用戶個資（錢包地址即身份）
- 需諮詢法律顧問確認各目標市場的合規要求
- 考慮設置地理封鎖（GeoIP）排除嚴格監管地區

---

## Appendix A: Expected Value Simulation

以 $1 USDC 下注為例，完整一輪（36→1）的期望值：

```
每一注的 EV = (1/(N+1)) x N - (N/(N+1)) x 1
            = N/(N+1) - N/(N+1)
            = 0  (數學公平)

平台獲利來自：
1. 「0」出現的機率 = 1/(N+1)
2. 未中獎時的 5% 抽水
3. 中獎時的 5% 手續費
```

Monte Carlo 模擬建議：運行 1,000,000 次完整遊戲循環，驗證：
- 平台平均獲利率 > 3%
- 儲備池破產機率 < 0.01%
- 平均遊戲循環長度（36→中獎的平均注數）
