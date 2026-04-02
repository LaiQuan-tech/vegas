# Spec 01: Smart Contracts

## Requirements
- CyberRoulette.sol: Core game logic with VRF, fund splitting, relay, liquidation
- LegacyPot.sol: Pot accumulation and distribution
- RouletteFactory.sol: Multi-table management
- All contracts compile with Solidity 0.8.24 via Foundry

## Acceptance Criteria
- [ ] `forge build` compiles all contracts without errors
- [ ] CyberRoulette implements: placeBet, abandonSeat, claimSeat, rebalance, maxBet
- [ ] LegacyPot implements: deposit, withdraw, calculatePotShare, mergeFrom
- [ ] RouletteFactory implements: createTable, getTableStates, getHottestTable
- [ ] Fund split: 80% reserve / 15% pot / 5% platform on lose
- [ ] Zero hit: 50% pot / 50% platform
- [ ] Win payout: bet * currentSlots + potShare - 5% fee
- [ ] Pot formula: totalPot * (36 - currentSlots) / 36
- [ ] Dynamic maxBet: (balance * 80) / (currentSlots * 100)
- [ ] Unit tests pass: `forge test` all green

**Output when complete:** `<promise>DONE</promise>`
