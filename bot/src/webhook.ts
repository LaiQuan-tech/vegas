import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { Bot } from "grammy";
import { formatSlotAlertL2, formatSlotAlertL3 } from "./alerts.js";

interface AlertPayload {
  chatIds: number[];
  message?: string;
  level: "L2" | "L3" | "custom";
  data?: {
    tableId: string;
    tableName: string;
    hotSlots: number[];
    heatScore: number;
    streak: number;
    claimWindow?: number;
    expectedEV?: number;
  };
}

export function startWebhookServer(bot: Bot, port: number = 3002): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Health check
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "online", timestamp: Date.now() }));
      return;
    }

    // Alert endpoint
    if (req.method === "POST" && req.url === "/alert") {
      try {
        const body = await readBody(req);
        const payload: AlertPayload = JSON.parse(body);

        if (!payload.chatIds?.length) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "chatIds required" }));
          return;
        }

        const results = await dispatchAlerts(bot, payload);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            dispatched: results.sent,
            failed: results.failed,
            total: payload.chatIds.length,
          })
        );
      } catch (err) {
        console.error("[webhook] Parse error:", err);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON payload" }));
      }
      return;
    }

    // 404 for anything else
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[webhook] Alert server listening on 0.0.0.0:${port}`);
  });
}

async function dispatchAlerts(
  bot: Bot,
  payload: AlertPayload
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const chatId of payload.chatIds) {
    try {
      if (payload.level === "custom" && payload.message) {
        await bot.api.sendMessage(chatId, payload.message);
      } else if (payload.level === "L2" && payload.data) {
        const { text, keyboard } = formatSlotAlertL2(payload.data);
        await bot.api.sendMessage(chatId, text, {
          reply_markup: keyboard,
        });
      } else if (payload.level === "L3" && payload.data) {
        const { text, keyboard } = formatSlotAlertL3({
          ...payload.data,
          claimWindow: payload.data.claimWindow ?? 30,
          expectedEV: payload.data.expectedEV ?? 0,
        });
        await bot.api.sendMessage(chatId, text, {
          reply_markup: keyboard,
        });
      } else {
        // Fallback: send raw message if provided
        if (payload.message) {
          await bot.api.sendMessage(chatId, payload.message);
        }
      }
      sent++;
    } catch (err) {
      console.error(`[webhook] Failed to send to ${chatId}:`, err);
      failed++;
    }
  }

  return { sent, failed };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
