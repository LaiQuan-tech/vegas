import { InlineKeyboard } from "grammy";

const WEBAPP_URL = process.env.WEBAPP_URL || "https://cyberroulette.app";

// ── L2 Alert: 10-slot heat notification ──────────────────────────────
export function formatSlotAlertL2(data: {
  tableId: string;
  tableName: string;
  hotSlots: number[];
  heatScore: number;
  streak: number;
}): { text: string; keyboard: InlineKeyboard } {
  const heatBar = buildHeatBar(data.heatScore);
  const slotsDisplay = data.hotSlots.map((s) => `[${s}]`).join(" ");

  const text = [
    `\u{1F525} SLOT HEAT DETECTED`,
    ``,
    `\u{1F3B0} Table: ${data.tableName}`,
    `${heatBar} Heat: ${data.heatScore}%`,
    `\u{1F4A0} Hot slots: ${slotsDisplay}`,
    `\u{26A1} Streak: ${data.streak} consecutive`,
    ``,
    `\u{1F50E} Pattern lock acquired. Move fast, runner.`,
  ].join("\n");

  const keyboard = new InlineKeyboard().url(
    "\u{1F30C} Open Table",
    `${WEBAPP_URL}/table/${data.tableId}`
  );

  return { text, keyboard };
}

// ── L3 Alert: 5-slot priority claim ──────────────────────────────────
export function formatSlotAlertL3(data: {
  tableId: string;
  tableName: string;
  hotSlots: number[];
  heatScore: number;
  streak: number;
  claimWindow: number;
  expectedEV: number;
}): { text: string; keyboard: InlineKeyboard } {
  const heatBar = buildHeatBar(data.heatScore);
  const slotsDisplay = data.hotSlots.map((s) => `\u{1F534}${s}`).join(" ");

  const text = [
    `\u{1F6A8} PRIORITY SIGNAL // L3 CLEARANCE`,
    `\u{2550}`.repeat(30),
    ``,
    `\u{1F3B0} Table: ${data.tableName}`,
    `${heatBar} Heat: ${data.heatScore}%`,
    `\u{1F534} Priority slots: ${slotsDisplay}`,
    `\u{26A1} Streak: ${data.streak} consecutive`,
    `\u{1F4B0} Expected EV: +${data.expectedEV.toFixed(2)}x`,
    `\u{23F1} Claim window: ${data.claimWindow}s`,
    ``,
    `\u{1F510} This signal is yours alone.`,
    `\u{1F525} The grid doesn't wait. Claim it or lose it.`,
  ].join("\n");

  const keyboard = new InlineKeyboard()
    .url("\u{26A1} CLAIM NOW", `${WEBAPP_URL}/table/${data.tableId}?claim=1`)
    .row()
    .url("\u{1F4CA} View Analysis", `${WEBAPP_URL}/table/${data.tableId}/stats`);

  return { text, keyboard };
}

// ── Heat bar visual ──────────────────────────────────────────────────
function buildHeatBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  return "\u{1F7E5}".repeat(filled) + "\u{2B1B}".repeat(empty);
}
