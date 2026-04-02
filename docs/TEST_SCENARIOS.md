# Test Scenarios — CyberRoulette

> STATUS: DRAFT — Awaiting human approval before any tests are written

---

## Flow 1: Wallet Connection & USDC Approval

**User Story:** As a player, I want to connect my wallet and approve USDC spending so I can place bets.

**Preconditions:** User has MetaMask/WalletConnect with USDC on Base

**Steps:**
1. Click "Connect Wallet" → RainbowKit modal opens
2. Select wallet provider → Wallet connected, address displayed
3. Click "Approve USDC" → MetaMask approval popup
4. Confirm approval → USDC spending approved for contract
5. Balance displayed in header

**Features Covered:**
- RainbowKit integration
- wagmi hooks
- USDC ERC-20 approve

**Edge Cases:**
- User rejects wallet connection
- Insufficient USDC balance
- Network mismatch (not on Base)
- Approval amount too low

---

## Flow 2: Place a Bet (Standard Round)

**User Story:** As a player, I want to place a bet on a number so I can try to win.

**Preconditions:** Wallet connected, USDC approved, table has slots available

**Steps:**
1. Enter table → See roulette wheel with N remaining slots
2. Click a number (1-N) → Number highlighted
3. Enter bet amount → Validated against maxBet
4. Click "Spin" → Transaction sent, loading state
5. Chainlink VRF callback → Result displayed

**Sub-flows:**
- **Win:** Prize calculated, pot share distributed, confetti animation, table resets to 36
- **Lose (number):** Slot removed, animation plays, currentSlots--, funds split 80/15/5
- **Lose (0 - System Wipe):** Red flash, funds split 50/50, slots unchanged

**Features Covered:**
- CyberRoulette.placeBet()
- Chainlink VRF integration
- Fund splitting logic
- Slot reduction animation
- Win/Lose UI states

**Edge Cases:**
- Bet amount > maxBet → Rejected
- Bet on invalid number (> currentSlots) → Rejected
- Contract reserve too low → maxBet reduced
- VRF callback timeout (>30s)
- Double-click prevention during pending tx

---

## Flow 3: Legacy Pot Payout

**User Story:** As a winning player, I want to receive my proportional share of the Legacy Pot.

**Preconditions:** Player wins when slots < 36

**Steps:**
1. Player wins at N slots remaining
2. Pot share calculated: `totalPot * (36 - N) / 36`
3. 5% platform fee deducted from total payout
4. USDC transferred to winner
5. Remaining pot rolls over to next round

**Features Covered:**
- LegacyPot.calculatePotShare()
- LegacyPot.withdraw()
- Platform fee deduction
- Pot rollover

**Edge Cases:**
- Win at 36 slots → 0% pot share (only bet payout)
- Win at 1 slot → 97.2% pot share
- Pot is empty (new table)
- Multiple tables, pot merge after liquidation

---

## Flow 4: Seat Relay (Abandon + Claim)

**User Story:** As a player, I want to abandon my seat; as a hunter, I want to claim an abandoned seat.

**Preconditions:** Table has active player, slots < 36

**Steps:**
1. Current player clicks "Abandon Seat" → Confirm modal
2. Confirm → Seat status changes to "OPEN", 30s countdown starts
3. L3 subscribers see seat first (5s priority window)
4. After 5s, all players can claim
5. Hunter clicks "Claim Seat" → Transaction sent
6. First valid tx wins → New player assigned

**Features Covered:**
- CyberRoulette.abandonSeat()
- CyberRoulette.claimSeat()
- L3 priority queue
- 30s countdown timer
- WebSocket real-time updates

**Edge Cases:**
- Multiple players claim simultaneously → First tx wins
- No one claims within 30s → Table enters liquidation countdown
- Player disconnects (implicit abandon after timeout)
- L3 subscriber claims during priority window

---

## Flow 5: Lobby & Table Discovery

**User Story:** As a player, I want to browse active tables and find high-value opportunities.

**Preconditions:** User is on the lobby page

**Steps:**
1. Load lobby → All active tables displayed
2. Each table shows: slots remaining, pot size, heat level, countdown
3. Filter by heat level (green/yellow/orange/red)
4. Sort by: pot size, slots remaining, newest
5. Click table → Navigate to table view

**Features Covered:**
- RouletteFactory.getAllTableStates()
- Lobby components
- Heat level system (Cold/Warm/Hot/Critical)
- Real-time updates via WebSocket

**Edge Cases:**
- No active tables
- Table liquidated while user is viewing lobby
- 100+ tables performance

---

## Flow 6: Subscription (Tail-Knife Alert)

**User Story:** As a hunter, I want to subscribe to alerts so I get notified when slots are low.

**Preconditions:** Wallet connected, Telegram account linked

**Steps:**
1. Navigate to /subscribe
2. Select tier (L1 free / L2 $9.9 / L3 $29.9)
3. Pay with USDC → Transaction confirmed
4. Link Telegram account via bot
5. Receive test notification

**Features Covered:**
- Subscription payment (USDC)
- Telegram bot integration
- Notification dispatch logic
- L2: 10-slot alert, L3: 5-slot alert + priority claim

**Edge Cases:**
- Payment fails mid-transaction
- Telegram not linked
- Subscription expires
- Downgrade from L3 to L2

---

## Flow 7: Liquidation & Table Merge

**User Story:** As the system, when no one plays a table for too long, funds should be redistributed.

**Preconditions:** Table has gone past its liquidation countdown

**Steps:**
1. Countdown reaches 0
2. Contract rebalance() called (Chainlink Automation or keeper)
3. Reserve 50% → Platform wallet
4. Reserve 50% + Pot → Hottest active table's pot
5. Table resets to 36 slots
6. Global announcement broadcast

**Features Covered:**
- CyberRoulette.rebalance()
- RouletteFactory.getHottestTable()
- Fund transfer between contracts
- WebSocket broadcast

**Edge Cases:**
- All tables are expired simultaneously
- Hottest table has 0 players
- Rebalance gas cost > reserve amount
- Rebalance called before timer expires → Rejected

---

## Flow 8: Transparency & Verification

**User Story:** As a player, I want to verify that the game is fair by checking on-chain data.

**Preconditions:** Game has been played

**Steps:**
1. View probability monitor panel on table page
2. See: win rate, payout rate, pot size, pot unlock %, system tax, reserve health
3. Click "Verify on Chain" → Opens Base explorer
4. View Chainlink VRF proof for any past round
5. View contract source code (verified on Basescan)

**Features Covered:**
- Probability monitor UI
- Basescan integration links
- Chainlink VRF verification
- Contract transparency

**Edge Cases:**
- VRF proof not yet indexed by explorer
- Base RPC node lag
