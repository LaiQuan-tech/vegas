# Spec 05: Contract Unit Tests

## Requirements
- Foundry tests for all three contracts
- Mock USDC and VRF coordinator
- Cover: bet, win, lose, zero, relay, liquidation, pot distribution

## Acceptance Criteria
- [ ] `forge test` runs all tests
- [ ] Win scenario tests pass (at 36, 18, 5, 1 slots)
- [ ] Lose scenario tests pass (fund split verified)
- [ ] System Wipe (0) tests pass
- [ ] Relay tests pass (abandon + claim)
- [ ] MaxBet calculation tests pass
- [ ] LegacyPot share calculation tests pass
- [ ] Unauthorized access tests pass (reverts correctly)
- [ ] All tests green, 0 failures

**Output when complete:** `<promise>DONE</promise>`
