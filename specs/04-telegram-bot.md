# Spec 04: Telegram Bot

## Requirements
- Grammy bot with commands: /start, /subscribe, /status, /link
- Alert formatting with cyberpunk tone
- Webhook endpoint for backend integration

## Acceptance Criteria
- [ ] Bot initializes without errors (with mock token)
- [ ] /start command returns welcome message with tier info
- [ ] /subscribe shows subscription status
- [ ] /status queries backend for table states
- [ ] /link links wallet address to telegram chat
- [ ] Alert formatter produces L2 and L3 messages
- [ ] Webhook server starts on port 3002
- [ ] TypeScript compiles without errors

**Output when complete:** `<promise>DONE</promise>`
