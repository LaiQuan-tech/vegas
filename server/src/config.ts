import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string = ""): string {
  return process.env[name] ?? fallback;
}

export const config = {
  /** PostgreSQL connection string (required) */
  DATABASE_URL: requireEnv("DATABASE_URL"),

  /** WebSocket RPC endpoint for listening to on-chain events (optional until contracts deployed) */
  RPC_WSS_URL: optionalEnv("RPC_WSS_URL"),

  /** CyberRoulette main contract address (optional until contracts deployed) */
  CONTRACT_ADDRESS: optionalEnv("CONTRACT_ADDRESS"),

  /** CyberRoulette factory contract address (optional until contracts deployed) */
  FACTORY_ADDRESS: optionalEnv("FACTORY_ADDRESS"),

  /** Telegram Bot API token (optional until bot configured) */
  TELEGRAM_BOT_TOKEN: optionalEnv("TELEGRAM_BOT_TOKEN"),

  /** HTTP server port */
  PORT: parseInt(process.env["PORT"] ?? "3001", 10),
} as const;
