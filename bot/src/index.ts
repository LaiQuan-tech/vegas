import "dotenv/config";
import { Bot } from "grammy";
import { startCommand } from "./commands/start.js";
import { subscribeCommand } from "./commands/subscribe.js";
import { statusCommand } from "./commands/status.js";
import { linkCommand } from "./commands/link.js";
import { startWebhookServer } from "./webhook.js";

// ── Validate env ─────────────────────────────────────────────────────
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("[fatal] TELEGRAM_BOT_TOKEN is not set. Exiting.");
  process.exit(1);
}

// ── Initialize bot ───────────────────────────────────────────────────
const bot = new Bot(token);

// ── Register commands ────────────────────────────────────────────────
bot.command("start", startCommand);
bot.command("subscribe", subscribeCommand);
bot.command("status", statusCommand);
bot.command("link", linkCommand);

// ── Error handling ───────────────────────────────────────────────────
bot.catch((err) => {
  console.error("[bot] Unhandled error:", err.error);
});

// ── Start services ───────────────────────────────────────────────────
async function main() {
  console.log("[bot] CyberRoulette alert bot starting...");

  // Start the webhook HTTP server for backend alert pushes
  const webhookPort = parseInt(process.env.WEBHOOK_PORT || "3002", 10);
  startWebhookServer(bot, webhookPort);

  // Start long polling
  await bot.start({
    onStart: (info) => {
      console.log(`[bot] @${info.username} is live on the grid.`);
    },
  });
}

main().catch((err) => {
  console.error("[fatal] Startup failed:", err);
  process.exit(1);
});
