# Implementation Plan — CyberRoulette

## Stage Overview

| Stage | Name | Scope | Agents |
|-------|------|-------|--------|
| 0 | Documentation | Anna docs, project scaffold | Orchestrator |
| 1 | Foundation | Smart contracts + Frontend scaffold + Backend scaffold | 10+ agents |
| 2 | Integration | Connect frontend ↔ contracts ↔ backend | 8+ agents |
| 3 | Polish | UI animations, sound, PWA, Telegram bot | 8+ agents |
| 4 | Testing | Unit tests, E2E, security audit, Monte Carlo sim | 8+ agents |
| 5 | Deploy | Testnet deploy, beta test, mainnet launch | Orchestrator + agents |

---

## Stage 1: Foundation (Current)

All agents dispatched in parallel. No dependencies between them.

### Agent 1: CyberRoulette.sol (Core Game Contract)
- State variables: currentSlots, legacyPot, currentPlayer, lastBetTimestamp
- placeBet() with Chainlink VRF callback
- Win/Lose/Zero logic with fund splitting
- abandonSeat() and claimSeat() relay mechanics
- Dynamic maxBet calculation
- Events: BetPlaced, SlotReduced, PotWon, SeatAbandoned, SeatClaimed

### Agent 2: LegacyPot.sol (Pot Management)
- Pot deposit/withdrawal logic
- calculatePotShare() formula
- Liquidation rebalance (48hr timer → 50/50 split)
- distributeToTable() for merging dead tables

### Agent 3: RouletteFactory.sol (Multi-table)
- Create new table instances
- Track all active tables
- getHottestTable() for liquidation routing
- getAllTableStates() for lobby

### Agent 4: Interfaces + Types
- ICyberRoulette.sol interface
- ILegacyPot.sol interface
- Shared TypeScript types (web + server)
- Event type definitions

### Agent 5: Foundry Project Setup
- foundry.toml configuration
- Chainlink VRF mock for testing
- USDC mock token for testing
- Base network config (mainnet + sepolia)
- Deploy scripts

### Agent 6: Next.js PWA Scaffold
- Next.js 14 app router setup
- Tailwind config (cyberpunk theme colors)
- PWA manifest + service worker
- Layout with cyberpunk styling
- Page stubs: / (lobby), /table/[id], /subscribe

### Agent 7: Wallet Integration
- RainbowKit + wagmi v2 setup
- USDC approve flow hook
- Contract interaction hooks (usePlaceBet, useClaimSeat, etc.)
- Base chain configuration

### Agent 8: Backend Scaffold
- Fastify + TypeScript setup
- PostgreSQL schema (users, subscriptions, table_snapshots)
- WebSocket server setup
- API routes stubs
- Environment config

### Agent 9: Telegram Bot Scaffold
- Bot setup with grammy/telegraf
- /subscribe command
- Alert message templates
- Webhook endpoint for backend integration

### Agent 10: Cyberpunk Theme + UI Components
- Color palette CSS variables
- Base UI components: Button, Card, Badge, Modal
- Font setup (Orbitron + JetBrains Mono)
- Lobby table card component
- Heat level indicator component

---

## Stage 2: Integration

### Agent work (8+ agents):
- Connect wallet → approve USDC → place bet flow
- WebSocket: backend listens to chain events → pushes to frontend
- Lobby: fetch all table states → render table cards
- Table view: real-time slot animation + bet UI
- Probability monitor panel
- Subscription payment (USDC → backend → DB)
- Telegram bot receives alerts from backend
- Relay mechanic UI (abandon/claim seat)

---

## Stage 3: Polish

### Agent work (8+ agents):
- Roulette wheel animation (slot removal effect)
- Sound effects system
- System Wipe (0) fullscreen effect
- Victory celebration animation
- Lobby heat level visual effects
- Mobile responsive optimization
- PWA install prompt
- Loading states + error boundaries

---

## Stage 4: Testing

### Blocked by: TEST_SCENARIOS.md human approval

### Agent work (8+ agents):
- Solidity unit tests (Foundry)
- Contract security audit (Slither + manual review)
- Frontend E2E tests
- API integration tests
- Monte Carlo simulation (1M rounds)
- Gas optimization analysis
- Chainlink VRF integration test (testnet)
- Load test (concurrent bets)

---

## Stage 5: Deploy

- Deploy to Base Sepolia testnet
- Beta test with 50 users
- Bug fixes from beta
- Deploy to Base mainnet
- Initial funding ($10,000 USDC)
- Launch campaign
