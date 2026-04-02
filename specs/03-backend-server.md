# Spec 03: Backend Server

## Requirements
- Fastify + TypeScript server
- PostgreSQL schema for users, table snapshots, bet history
- Chain event watcher (ethers v6 WebSocket)
- WebSocket for real-time updates
- REST API for tables and subscriptions

## Acceptance Criteria
- [ ] `npx tsx src/index.ts` starts server on port 3001
- [ ] GET /api/tables returns table list
- [ ] GET /api/tables/:address returns single table
- [ ] POST /api/subscribe creates subscription
- [ ] WebSocket connection accepts clients
- [ ] Chain watcher connects to RPC (with graceful fallback if no RPC)
- [ ] Notification dispatcher formats alerts correctly
- [ ] TypeScript compiles without errors

**Output when complete:** `<promise>DONE</promise>`
