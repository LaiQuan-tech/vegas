import { CommandContext, Context } from "grammy";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

interface TableStatus {
  id: string;
  name: string;
  heatScore: number;
  activePlayers: number;
  hotSlots: number[];
  lastSpin: string;
}

export async function statusCommand(ctx: CommandContext<Context>) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/tables`);

    if (!res.ok) {
      await ctx.reply(
        "\u{26A0}\u{FE0F} Grid scan failed. Backend offline. Stand by."
      );
      return;
    }

    const tables = (await res.json()) as TableStatus[];

    if (!tables.length) {
      await ctx.reply("\u{1F50C} No active tables on the grid right now.");
      return;
    }

    const header = [
      `\u{1F4E1} GRID STATUS // LIVE SCAN`,
      `\u{2550}`.repeat(28),
      ``,
    ];

    const tableLines = tables.map((t) => {
      const heat = getHeatEmoji(t.heatScore);
      const bar = buildMiniBar(t.heatScore);
      const slots = t.hotSlots.length
        ? t.hotSlots.map((s) => `[${s}]`).join(" ")
        : "none";

      return [
        `${heat} ${t.name}`,
        `  ${bar} ${t.heatScore}%`,
        `  \u{1F465} Players: ${t.activePlayers}`,
        `  \u{1F4A0} Hot: ${slots}`,
        `  \u{1F55B} Last spin: ${formatTime(t.lastSpin)}`,
      ].join("\n");
    });

    const footer = [
      ``,
      `\u{2550}`.repeat(28),
      `\u{1F50E} Use /subscribe to unlock real-time alerts`,
    ];

    const message = [...header, ...tableLines, ...footer].join("\n\n");

    await ctx.reply(message);
  } catch (err) {
    console.error("[status] Backend error:", err);
    await ctx.reply(
      "\u{26A0}\u{FE0F} Grid connection lost. Reconnecting... try again."
    );
  }
}

function getHeatEmoji(score: number): string {
  if (score >= 80) return "\u{1F525}"; // fire
  if (score >= 60) return "\u{1F7E5}"; // red square
  if (score >= 40) return "\u{1F7E7}"; // orange square
  if (score >= 20) return "\u{1F7E8}"; // yellow square
  return "\u{1F7E9}"; // green square
}

function buildMiniBar(score: number): string {
  const filled = Math.round(score / 20);
  const empty = 5 - filled;
  return "\u{2588}".repeat(filled) + "\u{2591}".repeat(empty);
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "unknown";
  }
}
