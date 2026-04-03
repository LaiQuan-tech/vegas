# Security Audit Report -- CyberRoulette Protocol

**Auditor**: Blockchain Security Auditor (Automated)
**Date**: 2026-04-03
**Commit**: HEAD (main branch)
**Solidity Version**: 0.8.24
**Framework**: Foundry

---

## Executive Summary

CyberRoulette is a single-zero roulette protocol with shrinking slots, a cross-table LegacyPot, and Chainlink VRF v2.5 randomness. All monetary values are USDC (6 decimals). This audit reviewed 3 core contracts and 2 interfaces comprising approximately 830 lines of Solidity.

The review identified **14 findings**: 2 Critical, 3 High, 4 Medium, 3 Low, 2 Informational.

| Severity      | Count | Status       |
|---------------|-------|--------------|
| Critical      | 2     | Open         |
| High          | 3     | Open         |
| Medium        | 4     | Open         |
| Low           | 3     | Open         |
| Informational | 2     | Open         |

---

## Scope

| Contract                | SLOC | Description                                      |
|-------------------------|------|--------------------------------------------------|
| `CyberRoulette.sol`     | ~320 | Main game contract: betting, settlement, VRF     |
| `LegacyPot.sol`         | ~120 | Cross-table pot accumulation and distribution     |
| `RouletteFactory.sol`   | ~130 | Factory for deploying and tracking tables         |
| `ICyberRoulette.sol`    | ~160 | Interface for the game contract                  |
| `ILegacyPot.sol`        | ~70  | Interface for the pot contract                   |

---

## Findings

### C-01: Reserve Insolvency -- maxBet Formula Does Not Guarantee Payout Coverage

**Severity**: Critical
**Status**: Open
**Location**: `CyberRoulette.sol#L354-L364` (`_settleWin`), `CyberRoulette.sol#L530-L534` (`getMaxBet`)

**Description**:
The `getMaxBet()` formula is `(reserve * 4) / (currentSlots * 5)`. A win payout requires `betAmount * (slots - 1)` from the reserve (the bet itself covers 1x). For the reserve to cover this, we need:

```
reserve >= betAmount * (slots - 1)
betAmount <= reserve / (slots - 1)
```

But `getMaxBet` returns `(reserve * 4) / (slots * 5)` = `reserve * 0.8 / slots`.

For `slots = 2`: maxBet = `reserve * 0.4`. Reserve cost = `maxBet * 1` = `reserve * 0.4`. This is safe.
For `slots = 36`: maxBet = `reserve * 0.8 / 36` = `reserve * 0.0222`. Reserve cost = `maxBet * 35` = `reserve * 0.778`. This is safe.

However, the critical issue is that **multiple bets can be in-flight simultaneously** via VRF. Player A places a bet at maxBet. Before VRF settles, Player B (different address) can also place a bet at maxBet. If both win, the reserve cannot cover both payouts. The `hasPendingBet` check is per-player, not global.

Furthermore, `_settleWin` line 359-361 has a silent safety cap:
```solidity
if (reserveCost > reserve) {
    reserveCost = reserve;
}
```
This means a winner can be **silently underpaid** if the reserve is insufficient. The contract will not revert -- it will simply pay less than owed.

**Impact**: Winners can receive less than their rightful payout. With multiple concurrent bets (different players), the reserve can be drained below solvency. This is a real-money gambling contract where underpayment is unacceptable.

**Recommendation**:
1. Track total pending bet exposure (sum of all unsettled bets' worst-case reserve cost) and subtract it from available reserve when computing `getMaxBet`.
2. Remove the silent safety cap in `_settleWin`. If the reserve truly cannot pay, the bet should revert or the protocol must have a fallback mechanism. Silent underpayment in a gambling contract is a regulatory and trust failure.

```solidity
// Add state variable:
uint256 public pendingReserveExposure;

// In placeBet, after validation:
uint256 worstCaseReserveCost = uint256(amount) * uint256(currentSlots - 1);
pendingReserveExposure += worstCaseReserveCost;

// In getMaxBet:
uint256 availableReserve = reserve > pendingReserveExposure
    ? reserve - pendingReserveExposure
    : 0;
return (availableReserve * 4) / (uint256(slots) * 5);

// In settlement, deduct from pendingReserveExposure
```

---

### C-02: Local `pot` State Variable Is Never Decremented -- Dead Code Breaks Pot Accounting

**Severity**: Critical
**Status**: Open
**Location**: `CyberRoulette.sol#L113`, `CyberRoulette.sol#L572-L575` (`_calculateLocalPotShare`)

**Description**:
The `pot` state variable (line 113) is only ever incremented in `seedPot()` (line 608). It is **never decremented** anywhere in the contract. The `_calculateLocalPotShare` function reads `pot` to estimate the pot share, but:

1. On a loss, 15% goes to LegacyPot via `legacyPot.deposit()` -- `pot` is NOT incremented.
2. On a win, `_calculateLocalPotShare` reads `pot` to calculate `potShareGross`, but `pot` is never decremented after the share is paid.
3. On a zero, 50% goes to LegacyPot via `legacyPot.deposit()` -- `pot` is NOT incremented.

This means `pot` is effectively stuck at whatever value `seedPot()` set, or zero if never seeded. The `_calculateLocalPotShare` function returns stale/incorrect values. The `getPotShare()` view function returns misleading data to the frontend.

The actual pot logic is handled by LegacyPot (which tracks `totalPot` correctly), so the CyberRoulette-local `pot` variable is dead state that confuses accounting and event emission.

**Impact**: The `PotDistributed` event emits incorrect `potShareGross` values. Any frontend relying on `getPotShare()` or the `pot` state variable will display wrong data. While the actual fund flow through LegacyPot appears correct, the misinformation could mislead users about expected winnings.

**Recommendation**:
Either remove the `pot` state variable entirely and read the pot share from `legacyPot.calculatePotShare(currentSlots)` directly, or properly maintain `pot` by incrementing it on loss/zero deposits and decrementing it on win withdrawals. The cleaner approach is removal:

```solidity
// Remove: uint256 public pot;
// Remove: function seedPot(...)
// Replace _calculateLocalPotShare with:
function _calculateLocalPotShare(uint8 slots) internal view returns (uint256 share) {
    if (slots >= MAX_SLOTS) return 0;
    share = legacyPot.calculatePotShare(uint256(slots));
}
```

---

### H-01: Seat Bypass -- Any Player Can Bet Without Holding the Seat

**Severity**: High
**Status**: Open
**Location**: `CyberRoulette.sol#L189-L239` (`placeBet`)

**Description**:
The `placeBet` function checks if `currentPlayer == address(0)` and auto-assigns the seat (line 209-211), but it **never validates that `msg.sender == currentPlayer`** when a seat is already occupied. Any address can place a bet regardless of who holds the seat.

```solidity
// Line 208-211: Only checks if seat is empty, never enforces seat ownership
if (currentPlayer == address(0)) {
    currentPlayer = msg.sender;
}
// No check: require(msg.sender == currentPlayer)
```

A different player can place a bet while someone else holds the seat. The seat mechanism (abandon, relay, claim) becomes purely cosmetic with no enforcement.

**Impact**: The entire seat/relay/L3-priority system is non-functional as an access control mechanism. Any player can bet at any time, defeating the purpose of the seat system. If the seat was intended to limit who can play (e.g., for fairness or rate-limiting), this is completely bypassed.

**Recommendation**:
Add a seat ownership check in `placeBet`:

```solidity
if (currentPlayer == address(0)) {
    currentPlayer = msg.sender;
} else if (msg.sender != currentPlayer) {
    revert Unauthorized();
}
```

---

### H-02: Rebalance Allows Owner to Extract Reserve Funds (Rug Vector)

**Severity**: High
**Status**: Open
**Location**: `CyberRoulette.sol#L440-L475` (`rebalance`)

**Description**:
The `rebalance` function sends 50% of the reserve directly to `owner()`. While it requires a timeout to have elapsed, the owner controls:

1. Whether to pause the game (preventing new bets and making the timeout elapse).
2. The `target` address parameter (can set to any address they control, or `address(0)` to send to LegacyPot which they also own).

After pausing the game and waiting for the timeout, the owner can call `rebalance` repeatedly (the function resets slots to 36 and reserve to 0 each call, but if the owner seeds reserve again, they can repeat). More critically, the owner receives 50% of user-funded reserve in a single call.

The reserve is funded by 80% of player losses. This means the owner can extract player loss funds beyond the 5% platform fee that was the stated fee structure.

**Impact**: Owner can extract up to 50% of the reserve (which is 80% of cumulative player losses minus payouts). This is a trust assumption that must be clearly disclosed. For a gambling protocol, users expect the reserve exists to guarantee payouts, not to be extractable by the owner.

**Recommendation**:
1. Use a timelock and/or multi-sig for rebalance operations.
2. Limit the owner's share of rebalance to the platform fee percentage (5%), not 50%.
3. Require the non-owner portion to go to another active table (not an arbitrary address) or back to LegacyPot exclusively.
4. Alternatively, emit a clear event and enforce a waiting period (e.g., 7 days) between pause and rebalance so users can withdraw.

---

### H-03: VRF Callback Gas Limit May Be Insufficient for Win Path

**Severity**: High
**Status**: Open
**Location**: `CyberRoulette.sol#L87` (`CALLBACK_GAS_LIMIT = 500_000`)

**Description**:
The win settlement path (`_settleWin`) performs:
1. State updates (reserve deduction, slot reset, platform fee).
2. `usdc.safeTransfer(player, netBasePrize)` -- USDC transfer with proxy overhead.
3. `legacyPot.withdraw(player, slots)` -- which internally:
   a. Computes pot share.
   b. Deducts from `totalPot`.
   c. `usdc.safeTransfer(winner, netPayout)` -- another USDC transfer.
   d. `usdc.safeTransfer(owner(), fee)` -- a third USDC transfer.

USDC (Circle's implementation) is a proxy contract, and each `transfer` involves DELEGATECALL overhead. Three USDC transfers plus the LegacyPot's reentrancy guard check, storage reads/writes, and event emissions can easily exceed 500,000 gas, especially on L1 Ethereum or when USDC's blocklist check adds gas.

If the callback reverts due to out-of-gas, the VRF request is lost. The bet is stuck as unsettled forever (`bet.settled` remains false, `hasPendingBet[player]` remains true). The player's funds are locked with no recovery mechanism.

**Impact**: Winners may never receive their payout if gas is insufficient. The player's bet amount is already transferred to the contract and there is no refund mechanism. The `hasPendingBet` flag permanently blocks the player from placing new bets.

**Recommendation**:
1. Increase `CALLBACK_GAS_LIMIT` to at least 800,000 or make it configurable by the owner.
2. Add a `refundStaleBet(uint256 requestId)` function that allows the owner (or the player after a timeout) to refund unsettled bets.
3. Wrap the LegacyPot interaction in a try/catch so the base prize payout succeeds even if the pot withdrawal fails.

```solidity
// In _settleWin, wrap pot interaction:
if (potShareGross > 0) {
    try legacyPot.withdraw(player, uint256(slots)) {} catch {
        emit PotWithdrawFailed(requestId, player, potShareGross);
    }
}
```

---

### M-01: No Bet Refund Mechanism for Stuck VRF Requests

**Severity**: Medium
**Status**: Open
**Location**: `CyberRoulette.sol#L189-L239`, `CyberRoulette.sol#L284-L307`

**Description**:
If a VRF request fails to deliver (Chainlink outage, subscription runs out of LINK, gas limit issue), the bet is permanently stuck. The player's USDC is locked in the contract, `hasPendingBet[player]` remains true blocking future bets, and there is no admin or player-initiated refund path.

**Impact**: Player funds are permanently locked. The player is permanently blocked from the protocol. There is no recovery mechanism.

**Recommendation**:
Add a time-gated refund function:

```solidity
uint256 public constant BET_TIMEOUT = 1 hours;

function refundStaleBet(uint256 requestId) external nonReentrant {
    Bet storage bet = _bets[requestId];
    require(bet.player != address(0), "Unknown bet");
    require(!bet.settled, "Already settled");
    require(block.timestamp > lastBetTimestamp + BET_TIMEOUT, "Not stale yet");

    bet.settled = true;
    hasPendingBet[bet.player] = false;

    usdc.safeTransfer(bet.player, bet.amount);
    emit BetRefunded(requestId, bet.player, bet.amount);
}
```

---

### M-02: USDC Blocklist and Pause Can Brick Settlement

**Severity**: Medium
**Status**: Open
**Location**: `CyberRoulette.sol#L385-L395` (`_settleWin`), `LegacyPot.sol#L117-L122` (`withdraw`)

**Description**:
USDC (Centre/Circle) has a blocklist and pause mechanism. If the winning player's address is blocklisted by Circle, or if USDC is globally paused:

1. `usdc.safeTransfer(player, netBasePrize)` in `_settleWin` will revert.
2. The entire `fulfillRandomWords` callback reverts.
3. The bet is stuck as unsettled with no recovery path (see M-01).

Similarly, if the LegacyPot owner's address gets blocklisted, `usdc.safeTransfer(owner(), fee)` in LegacyPot's `withdraw` reverts, bricking all win settlements.

**Impact**: A single blocklisted address can permanently lock a bet. USDC pause (which Circle has used before) blocks all settlements system-wide.

**Recommendation**:
1. Wrap USDC transfers in try/catch within the VRF callback. On failure, store the owed amount in a `pendingWithdrawals` mapping and let the player pull later (pull pattern).
2. For LegacyPot fee transfer, accumulate fees in a mapping rather than sending inline.

---

### M-03: LegacyPot `withdraw` Called with Pre-Reset Slots but After `currentSlots` Reset

**Severity**: Medium
**Status**: Open
**Location**: `CyberRoulette.sol#L373-L395` (`_settleWin`)

**Description**:
In `_settleWin`, `currentSlots` is reset to `MAX_SLOTS` (line 373) before calling `legacyPot.withdraw(player, uint256(slots))` (line 394). The `slots` local variable correctly holds the pre-reset value. However, if another VRF callback were to execute between the state change and the external call (not possible in a single transaction, but worth noting for future upgrades), or if any read-only reentrancy were to occur, `currentSlots` would show 36 while the pot share is computed for the pre-reset value.

More importantly, the `_calculateLocalPotShare(slots)` on line 371 uses the local `pot` variable (which is broken per C-02), while `legacyPot.withdraw` computes its own share from `totalPot`. These two values can diverge, meaning the `potShareGross` emitted in the `PotDistributed` event may not match what LegacyPot actually pays.

**Impact**: Misleading event data. The `PotDistributed` event may report a different `potShareGross` than what the winner actually receives from LegacyPot.

**Recommendation**:
Remove the local pot share calculation and rely solely on LegacyPot's accounting. Emit the actual payout amount returned from LegacyPot, or have LegacyPot return the net amount paid.

---

### M-04: `claimSeat` Allows Claim After Relay Window with Stale State

**Severity**: Medium
**Status**: Open
**Location**: `CyberRoulette.sol#L256-L272` (`claimSeat`)

**Description**:
The `claimSeat` function reverts if `elapsed > RELAY_WINDOW` (line 261), but there is no mechanism to clean up an expired relay. If no one claims the seat within 30 seconds, `seatRelay.active` remains `true` forever. The `seatOpen()` view function returns `true` when `seatRelay.active` is true (line 556), misleading the frontend.

Meanwhile, `placeBet` auto-assigns the seat when `currentPlayer == address(0)` (line 209), bypassing the relay entirely. But `currentPlayer` was set to `address(0)` only via `abandonSeat` (line 248), and the relay prevents claiming after 30 seconds, creating a limbo state where:
- `currentPlayer == address(0)` (seat is empty)
- `seatRelay.active == true` (relay is "active" but expired)
- `seatOpen()` returns `true`
- `claimSeat()` reverts with `RelayWindowExpired`
- `placeBet()` works fine (ignores relay state, auto-assigns seat)

This is not a fund-loss issue but creates confusing UX and a dead relay state.

**Impact**: Stale relay state persists indefinitely. Frontend shows seat as open via relay but `claimSeat` always reverts. Users must use `placeBet` to implicitly claim.

**Recommendation**:
Add a cleanup path: after `RELAY_WINDOW` expires, allow anyone to reset the relay state, or have `placeBet` clear the stale relay.

```solidity
// In placeBet, after auto-assigning seat:
if (currentPlayer == address(0)) {
    currentPlayer = msg.sender;
    if (seatRelay.active) {
        seatRelay.active = false;
    }
}
```

---

### L-01: `batchSetL3Subscribers` Has No Length Limit -- Potential DoS via Gas

**Severity**: Low
**Status**: Open
**Location**: `CyberRoulette.sol#L489-L503` (`batchSetL3Subscribers`)

**Description**:
The batch function iterates over an unbounded array. While only callable by `onlyOwner`, an extremely large array could exceed the block gas limit, causing the transaction to revert. This is a self-DoS risk for the admin.

**Impact**: Admin inconvenience. No direct user impact since the function is owner-only.

**Recommendation**:
Add a reasonable length cap (e.g., 200) or document the expected maximum batch size.

---

### L-02: RouletteFactory Constructor Does Not Validate Zero Addresses

**Severity**: Low
**Status**: Open
**Location**: `RouletteFactory.sol#L96-L109` (constructor)

**Description**:
The factory constructor accepts `usdc_`, `legacyPot_`, `vrfCoordinator_` without checking for `address(0)`. If deployed with a zero address, all subsequently created tables will be misconfigured and non-functional.

**Impact**: Deployment error would require redeployment of the factory. No runtime fund loss since tables would fail on first interaction.

**Recommendation**:
Add zero-address checks for all critical constructor parameters:

```solidity
require(usdc_ != address(0), "Zero USDC");
require(legacyPot_ != address(0), "Zero LegacyPot");
require(vrfCoordinator_ != address(0), "Zero VRF");
```

---

### L-03: Factory-Created Tables Are Owned by the Factory, Not the Deployer

**Severity**: Low
**Status**: Open
**Location**: `RouletteFactory.sol#L117-L133` (`createTable`)

**Description**:
`CyberRoulette` inherits `VRFConsumerBaseV2Plus` which uses `ConfirmedOwner`. The `owner()` of a factory-created table is the factory contract address (since the factory's `createTable` is `msg.sender` during construction), not the factory's owner EOA. This means:

1. Admin functions on the table (`setGamePaused`, `rebalance`, `withdrawPlatformFees`, etc.) must be called by the factory contract.
2. The factory has no proxy functions to call these admin functions on created tables.
3. The tables are effectively unmanageable after creation.

**Impact**: All admin operations on factory-created tables are inaccessible unless the factory is extended with forwarding functions or ownership is transferred post-deployment.

**Recommendation**:
After creating a table, transfer ownership to the factory owner:

```solidity
function createTable() external onlyOwner returns (address table) {
    CyberRoulette newTable = new CyberRoulette(...);
    // Transfer table ownership to the factory owner
    newTable.transferOwnership(msg.sender);
    // ... rest of function
}
```

Or add admin proxy functions to the factory that forward calls to owned tables.

---

### I-01: Missing Event Emission on `seedReserve` and `seedPot`

**Severity**: Informational
**Status**: Open
**Location**: `CyberRoulette.sol#L598-L610`

**Description**:
The `seedReserve` and `seedPot` functions modify critical financial state but emit no events. Off-chain monitoring systems cannot track reserve bootstrapping.

**Recommendation**:
Add events:
```solidity
event ReserveSeeded(address indexed from, uint256 amount);
event PotSeeded(address indexed from, uint256 amount);
```

---

### I-02: `withdrawPlatformFees` Reuses `ZeroBetAmount` Error for Zero Balance

**Severity**: Informational
**Status**: Open
**Location**: `CyberRoulette.sol#L509`

**Description**:
When `platformBalance == 0`, the function reverts with `ZeroBetAmount()` which is semantically incorrect -- there is no bet involved. This is a minor readability issue.

**Recommendation**:
Add a dedicated error: `error NoPlatformFees();`

---

## Additional Analysis

### Reentrancy Assessment

**Status**: PASS (with caveats)

- `CyberRoulette`: Uses OpenZeppelin `ReentrancyGuard` on `placeBet`, `rebalance`, `seedReserve`, `seedPot`, and `withdrawPlatformFees`. The VRF callback (`fulfillRandomWords`) is not protected by `nonReentrant`, but it is only callable by the VRF Coordinator (enforced by `VRFConsumerBaseV2Plus`). Settlement functions follow checks-effects-interactions pattern.
- `LegacyPot`: Uses `ReentrancyGuard` on `deposit`, `withdraw`, `mergeFrom`, and `emergencyWithdraw`. Follows checks-effects-interactions.
- External calls to LegacyPot and USDC occur after state updates. USDC (standard ERC-20) does not have transfer hooks, so reentrancy via token transfer is not a concern unless the protocol later supports ERC-777 tokens.

**Caveat**: The `fulfillRandomWords` callback makes external calls to both USDC and LegacyPot. If LegacyPot were compromised or replaced with a malicious contract, it could re-enter CyberRoulette through a different function. However, `nonReentrant` on `placeBet` prevents the most dangerous re-entry vector.

### VRF Manipulation Assessment

**Status**: PASS

- Chainlink VRF v2.5 with `REQUEST_CONFIRMATIONS = 3` provides adequate manipulation resistance. The random result is determined by the VRF Coordinator after the bet is placed, so neither the player nor the miner can influence the outcome after commitment.
- The modulo operation `randomWords[0] % (slots + 1)` has negligible bias since `slots + 1` (max 37) is astronomically smaller than 2^256.

### Front-Running Assessment

**Status**: LOW RISK

- Bet placement is committed before the random result is known (VRF request/fulfill separation). A front-runner cannot see the result before the bet.
- However, a miner/sequencer could observe a `placeBet` transaction and front-run it to claim the seat first (see H-01 -- seat enforcement is broken anyway). On L2s with a centralized sequencer, this risk is reduced.

### Integer Overflow Assessment

**Status**: PASS

- Solidity 0.8.24 provides automatic overflow checks for all arithmetic operations.
- The `unchecked` block in `LegacyPot._calculatePotShare` (line 201) is safe because `currentSlots <= MAX_SLOTS` is enforced by callers, preventing underflow in `MAX_SLOTS - currentSlots`.
- The `unchecked { ++i; }` loop increments throughout the codebase are safe (standard gas optimization pattern).
- `uint128` for bet amounts caps exposure at ~340 billion USDC, which is safe.

### Fund Extraction Assessment

**Status**: CONCERN (see H-02)

- The owner can extract funds through: `withdrawPlatformFees` (legitimate -- 5% of wins, 5% of losses, 50% of zeros), `rebalance` (50% of reserve -- see H-02), `LegacyPot.emergencyWithdraw` (entire pot).
- Combined, the owner has access to significantly more than the stated 5% platform fee. The `emergencyWithdraw` on LegacyPot can drain the entire cross-table pot with no timelock or multi-sig requirement.

### USDC Specifics Assessment

**Status**: PARTIAL PASS

- All amounts correctly use 6-decimal USDC. No hardcoded 18-decimal assumptions.
- `SafeERC20` is used for all transfers -- handles non-standard return values.
- `forceApprove` is used instead of `approve` -- correct for USDC which has the approve race condition.
- **Missing**: No handling for USDC blocklist or pause (see M-02). No check for fee-on-transfer tokens (not relevant for USDC but worth noting if token is ever changed).

---

## Summary of Recommendations by Priority

### Must Fix Before Deployment

| ID   | Finding                                            | Fix Complexity |
|------|----------------------------------------------------|----------------|
| C-01 | Reserve insolvency from concurrent bets            | Medium         |
| C-02 | Dead `pot` variable -- broken pot accounting       | Low            |
| H-01 | Seat bypass -- no enforcement on `placeBet`        | Low            |
| H-03 | VRF callback gas limit too low for win path        | Low            |
| M-01 | No refund mechanism for stuck VRF bets             | Medium         |

### Should Fix Before Deployment

| ID   | Finding                                            | Fix Complexity |
|------|----------------------------------------------------|----------------|
| H-02 | Rebalance allows 50% reserve extraction by owner   | Medium         |
| M-02 | USDC blocklist/pause can brick settlement          | High           |
| M-03 | Misleading pot share events                        | Low            |
| L-03 | Factory tables have inaccessible admin functions   | Low            |

### Fix in Next Release

| ID   | Finding                                            | Fix Complexity |
|------|----------------------------------------------------|----------------|
| M-04 | Stale relay state after window expiry              | Low            |
| L-01 | Unbounded batch array                              | Low            |
| L-02 | Missing zero-address checks in factory constructor | Low            |
| I-01 | Missing events on seed functions                   | Low            |
| I-02 | Misleading error reuse                             | Low            |

---

## Methodology

1. **Manual code review**: Line-by-line analysis of all 5 files in scope.
2. **Control flow analysis**: Traced all execution paths from `placeBet` through VRF callback to settlement.
3. **Economic modeling**: Verified reserve solvency under concurrent bet scenarios and edge cases (1 slot, 36 slots, max bet).
4. **Access control mapping**: Identified all privileged functions and verified modifier coverage.
5. **Token flow tracing**: Mapped all USDC movements through CyberRoulette, LegacyPot, and external addresses.
6. **Composability risk analysis**: Evaluated LegacyPot as an external dependency and its failure modes.
7. **Known vulnerability pattern matching**: Checked against SWC Registry, DeFi exploit database, and common Chainlink VRF integration pitfalls.

---

## Disclaimer

This audit is a point-in-time review of the source code provided. It does not guarantee the absence of vulnerabilities. The findings are based on manual review without access to a deployed instance or automated fuzzing results. A follow-up audit should be performed after fixes are applied, and invariant fuzzing with Foundry/Echidna is strongly recommended before mainnet deployment.
