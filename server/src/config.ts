import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  /** PostgreSQL connection string */
  DATABASE_URL: requireEnv("DATABASE_URL"),

  /** WebSocket RPC endpoint for listening to on-chain events */
  RPC_WSS_URL: requireEnv("RPC_WSS_URL"),

  /** CyberRoulette main contract address */
  CONTRACT_ADDRESS: requireEnv("CONTRACT_ADDRESS"),

  /** CyberRoulette factory contract address */
  FACTORY_ADDRESS: requireEnv("FACTORY_ADDRESS"),

  /** Telegram Bot API token */
  TELEGRAM_BOT_TOKEN: requireEnv("TELEGRAM_BOT_TOKEN"),

  /** HTTP server port */
  PORT: parseInt(process.env["PORT"] ?? "3001", 10),
} as const;
