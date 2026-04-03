import { CommandContext, Context, InlineKeyboard } from "grammy";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
if (!process.env.BACKEND_URL) {
  console.warn("[warn] BACKEND_URL not set, falling back to http://localhost:3001");
}
const WEBAPP_URL = process.env.WEBAPP_URL || "https://cyberroulette.app";

export async function subscribeCommand(ctx: CommandContext<Context>) {
  const chatId = ctx.chat.id;

  try {
    const res = await fetch(`${BACKEND_URL}/api/subscription/${chatId}`);

    if (res.ok) {
      const sub = (await res.json()) as {
        tier: string;
        expiresAt: string | null;
        active: boolean;
      };

      const tierEmoji =
        sub.tier === "L3" ? "\u{1F534}" : sub.tier === "L2" ? "\u{1F7E1}" : "\u{1F7E2}";
      const expiry = sub.expiresAt
        ? new Date(sub.expiresAt).toLocaleDateString()
        : "N/A";

      const text = [
        `\u{1F4E1} SUBSCRIPTION STATUS`,
        `\u{2550}`.repeat(28),
        ``,
        `${tierEmoji} Current tier: ${sub.tier}`,
        `\u{1F4C5} ${sub.tier === "L1" ? "Free tier \u{2014} no expiry" : `Expires: ${expiry}`}`,
        `\u{26A1} Status: ${sub.active ? "ACTIVE" : "EXPIRED"}`,
        ``,
        sub.tier !== "L3"
          ? `\u{1F51D} Upgrade to unlock deeper signals.`
          : `\u{1F510} Maximum clearance. You see everything.`,
      ].join("\n");

      const keyboard = new InlineKeyboard();
      if (sub.tier !== "L3") {
        keyboard.url(
          "\u{26A1} Upgrade Tier",
          `${WEBAPP_URL}/subscribe?chat=${chatId}`
        );
      }
      keyboard.url(
        "\u{1F4CB} Manage Subscription",
        `${WEBAPP_URL}/account?chat=${chatId}`
      );

      await ctx.reply(text, { reply_markup: keyboard });
    } else {
      // No subscription found, show signup prompt
      const text = [
        `\u{1F30C} No active subscription detected.`,
        ``,
        `You're running on L1 // FREE.`,
        `Basic grid access only.`,
        ``,
        `\u{1F7E1} L2 ($9.9/mo) \u{2014} 10-slot heat alerts`,
        `\u{1F534} L3 ($29.9/mo) \u{2014} 5-slot priority + claim`,
        ``,
        `\u{26A1} Jack in deeper, runner.`,
      ].join("\n");

      const keyboard = new InlineKeyboard().url(
        "\u{1F680} Subscribe Now",
        `${WEBAPP_URL}/subscribe?chat=${chatId}`
      );

      await ctx.reply(text, { reply_markup: keyboard });
    }
  } catch (err) {
    console.error("[subscribe] Backend error:", err);
    await ctx.reply(
      "\u{26A0}\u{FE0F} Grid connection unstable. Try again in a moment, runner."
    );
  }
}
