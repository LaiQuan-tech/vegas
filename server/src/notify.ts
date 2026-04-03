import { config } from "./config.js";
import { getActiveSubscribers } from "./db/index.js";

const TG_API = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  if (!config.TELEGRAM_BOT_TOKEN) {
    console.warn("[notify] TELEGRAM_BOT_TOKEN not set — skipping notification");
    return false;
  }

  try {
    const res = await fetch(`${TG_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[notify] Telegram API error ${res.status}:`, body);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[notify] Failed to send Telegram message:", err);
    return false;
  }
}

/**
 * Notify subscribers when a table reaches critical slot thresholds.
 *
 * Subscription levels:
 *   L1 — no automatic alerts (manual check only)
 *   L2 — alert when slots <= 10
 *   L3 — alert when slots <= 5
 */
export async function notifySubscribers(
  tableAddress: string,
  currentSlots: number,
  pot: string,
): Promise<void> {
  // Determine minimum subscription level needed for this threshold
  let minLevel: number;
  if (currentSlots <= 5) {
    minLevel = 3;
  } else if (currentSlots <= 10) {
    minLevel = 2;
  } else {
    // No notification needed above 10 slots
    return;
  }

  const subscribers = await getActiveSubscribers(minLevel);

  if (subscribers.length === 0) return;

  const shortAddr = `${tableAddress.slice(0, 6)}...${tableAddress.slice(-4)}`;
  const potEth = (Number(pot) / 1e18).toFixed(4);

  const urgency = currentSlots <= 5 ? "CRITICAL" : "WARNING";
  const emoji = currentSlots <= 5 ? "\u{1F6A8}" : "\u26A0\uFE0F";

  const message = [
    `${emoji} <b>${urgency}: Table Update</b>`,
    ``,
    `<b>Table:</b> <code>${shortAddr}</code>`,
    `<b>Slots remaining:</b> ${currentSlots}/36`,
    `<b>Pot:</b> ${potEth} ETH`,
    ``,
    currentSlots <= 5
      ? `Only <b>${currentSlots}</b> slots left — pot is about to pop!`
      : `Slots dropping fast — <b>${currentSlots}</b> remaining.`,
  ].join("\n");

  // Fire all notifications concurrently — do not block the event loop
  const results = await Promise.allSettled(
    subscribers.map((sub) => sendTelegram(sub.telegram_chat_id, message)),
  );

  const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;
  const failed = results.length - sent;

  if (failed > 0) {
    console.warn(`[notify] ${sent} sent, ${failed} failed for table ${shortAddr}`);
  }
}

/**
 * Send a one-off event notification (pot won, system wipe, etc.)
 */
export async function notifyEvent(
  eventType: "POT_WON" | "SYSTEM_WIPE" | "SEAT_OPEN",
  tableAddress: string,
  details: string,
): Promise<void> {
  // All event notifications go to L2+ subscribers
  const subscribers = await getActiveSubscribers(2);
  if (subscribers.length === 0) return;

  const shortAddr = `${tableAddress.slice(0, 6)}...${tableAddress.slice(-4)}`;

  const titles: Record<string, string> = {
    POT_WON: "\u{1F3C6} Pot Won!",
    SYSTEM_WIPE: "\u{1F4A5} System Wipe!",
    SEAT_OPEN: "\u{1FA91} Seat Open!",
  };

  const message = [
    `<b>${titles[eventType] ?? eventType}</b>`,
    ``,
    `<b>Table:</b> <code>${shortAddr}</code>`,
    details,
  ].join("\n");

  await Promise.allSettled(
    subscribers.map((sub) => sendTelegram(sub.telegram_chat_id, message)),
  );
}
