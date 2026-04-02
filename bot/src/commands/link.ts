import { CommandContext, Context } from "grammy";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function linkCommand(ctx: CommandContext<Context>) {
  const args = ctx.match;

  if (!args || typeof args !== "string" || !args.trim()) {
    await ctx.reply(
      [
        `\u{1F517} WALLET LINK`,
        ``,
        `Usage: /link <wallet_address>`,
        ``,
        `Example:`,
        `  /link 0x1a2b3c4d5e6f...`,
        ``,
        `\u{1F510} This binds your Telegram to your on-chain identity.`,
        `    Alerts and payouts route through this link.`,
      ].join("\n")
    );
    return;
  }

  const walletAddress = args.trim();

  // Basic validation: hex address or solana-style base58
  const isEthLike = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
  const isSolLike = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress);

  if (!isEthLike && !isSolLike) {
    await ctx.reply(
      "\u{274C} Invalid wallet format. Provide an EVM (0x...) or Solana address."
    );
    return;
  }

  try {
    const chatId = ctx.chat.id;
    const userId = ctx.from?.id;
    const username = ctx.from?.username ?? null;

    const res = await fetch(`${BACKEND_URL}/api/link-wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        userId,
        username,
        walletAddress,
      }),
    });

    if (res.ok) {
      const short = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
      await ctx.reply(
        [
          `\u{2705} WALLET LINKED`,
          ``,
          `\u{1F4CE} Address: ${short}`,
          `\u{1F4E1} Chat ID: ${chatId}`,
          ``,
          `\u{26A1} You're now wired into the grid.`,
          `    Alerts and claims will route to this identity.`,
        ].join("\n")
      );
    } else {
      const err = await res.text();
      console.error("[link] Backend rejected:", err);
      await ctx.reply(
        "\u{274C} Link failed. Wallet may already be registered or backend rejected the request."
      );
    }
  } catch (err) {
    console.error("[link] Backend error:", err);
    await ctx.reply(
      "\u{26A0}\u{FE0F} Grid connection error. Try again in a moment."
    );
  }
}
