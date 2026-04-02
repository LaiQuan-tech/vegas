# Agent Handoff — CyberRoulette: Legacy Pot

## Reading Order
1. **This file** — understand the project
2. `docs/plans/2026-04-03-cyber-roulette-prd.md` — full PRD (game rules, financial model, tech stack)
3. `docs/plans/implementation-plan.md` — staged execution plan
4. Latest `docs/progress/stage-N-report.md` — current state
5. `CHANGELOG.md` — what changed recently

## Project Summary

CyberRoulette is a blockchain-based roulette game with a unique "decreasing grid relay" mechanic. Players bet USDC on a single number. If they lose, that number is removed (36→35→34...). A permanent "0" slot acts as the house edge. Players can abandon/relay seats, creating a social "last-hit" competition. A Legacy Pot accumulates from losing bets and unlocks proportionally as slots decrease.

**Target:** Asian Web3 players (Taiwan, SEA)
**Platform:** PWA website on Base L2
**Currency:** USDC (ERC-20)
**Style:** Cyberpunk / Dark Tech

## Current State

Stage 0 — Documentation and project scaffold complete. Stage 1 (Foundation) in progress.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Base (Coinbase L2) |
| Smart Contract | Solidity 0.8.x + Foundry |
| Randomness | Chainlink VRF v2.5 |
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Wallet | RainbowKit + wagmi v2 |
| Animation | Framer Motion |
| PWA | next-pwa |
| Backend | Node.js + Fastify + TypeScript |
| Database | PostgreSQL |
| Realtime | WebSocket (Socket.io) |
| Notification | Telegram Bot API |

## Conventions

- **Language:** TypeScript everywhere (except Solidity)
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`)
- **Branching:** `main` → `stage/N` → feature branches
- **Solidity:** Foundry for testing, OpenZeppelin for base contracts
- **Frontend:** App Router (Next.js 14), server components default
- **Styling:** Tailwind CSS + CSS variables for cyberpunk theme

## Project Structure

```
Vegas/
├── contracts/           # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── CyberRoulette.sol
│   │   ├── LegacyPot.sol
│   │   ├── RouletteFactory.sol
│   │   └── interfaces/
│   │       └── ICyberRoulette.sol
│   ├── test/
│   ├── script/
│   └── foundry.toml
├── web/                 # Next.js PWA frontend
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── public/
├── server/              # Node.js backend
│   └── src/
├── bot/                 # Telegram bot
│   └── src/
└── docs/                # All documentation
```

## Key Financial Parameters

```
FUND_SPLIT_RESERVE = 80%   // Payout reserve
FUND_SPLIT_POT = 15%       // Legacy pot
FUND_SPLIT_PLATFORM = 5%   // Platform profit

ZERO_SPLIT_POT = 50%       // When ball lands on 0
ZERO_SPLIT_PLATFORM = 50%

WIN_PLATFORM_FEE = 5%      // Deducted from winnings

POT_UNLOCK_FORMULA: potShare = totalPot * (36 - currentSlots) / 36
MAX_BET_FORMULA: maxBet = (contractBalance * 80) / (currentSlots * 100)
```

## Known Issues
- None yet (fresh project)
