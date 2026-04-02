import { CommandContext, Context } from "grammy";

export async function startCommand(ctx: CommandContext<Context>) {
  const name = ctx.from?.first_name ?? "runner";

  const welcome = [
    `\u{1F30C} Welcome to CyberRoulette, ${name}.`,
    ``,
    `You just jacked into the grid's most advanced`,
    `roulette intelligence network. Real-time heat`,
    `detection. Pattern analysis. Edge signals.`,
    ``,
    `\u{2550}`.repeat(28),
    `  \u{1F4E1} SUBSCRIPTION TIERS`,
    `\u{2550}`.repeat(28),
    ``,
    `\u{1F7E2} L1 // FREE`,
    `  \u{2022} Daily grid summary`,
    `  \u{2022} Basic heat notifications`,
    `  \u{2022} Community chat access`,
    ``,
    `\u{1F7E1} L2 // $9.9/mo`,
    `  \u{2022} 10-slot heat alerts`,
    `  \u{2022} Real-time pattern detection`,
    `  \u{2022} Table heat maps`,
    `  \u{2022} Historical streak data`,
    ``,
    `\u{1F534} L3 // $29.9/mo`,
    `  \u{2022} 5-slot priority alerts`,
    `  \u{2022} Priority claim window`,
    `  \u{2022} EV calculations per signal`,
    `  \u{2022} Dedicated signal channel`,
    `  \u{2022} First-access to new tables`,
    ``,
    `\u{2550}`.repeat(28),
    ``,
    `\u{1F4AC} Commands:`,
    `  /subscribe \u{2014} Manage your tier`,
    `  /status    \u{2014} Live table heat`,
    `  /link      \u{2014} Connect your wallet`,
    ``,
    `\u{26A1} The grid is live. Stay sharp.`,
  ].join("\n");

  await ctx.reply(welcome);
}
