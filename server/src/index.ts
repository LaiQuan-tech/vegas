import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { config } from "./config.js";
import { closePool } from "./db/index.js";
import { tableRoutes } from "./routes/tables.js";
import { subscribeRoutes } from "./routes/subscribe.js";
import { registerWebSocket } from "./ws.js";
import { startWatcher, stopWatcher } from "./watcher.js";

async function main(): Promise<void> {
  const isDev = process.env.NODE_ENV !== "production";
  const app = Fastify({
    logger: isDev
      ? {
          level: "info",
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }
      : { level: "info" },
  });

  // ── Plugins ──────────────────────────────
  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  await app.register(websocket);

  // ── Routes ───────────────────────────────
  await app.register(tableRoutes);
  await app.register(subscribeRoutes);
  await registerWebSocket(app);

  // ── Health check ─────────────────────────
  app.get("/health", async () => ({
    status: "ok",
    uptime: process.uptime(),
    ts: Date.now(),
  }));

  // ── Graceful shutdown ────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[server] Received ${signal}, shutting down...`);

    await stopWatcher();
    await app.close();
    await closePool();

    console.log("[server] Shutdown complete");
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  // ── Start ────────────────────────────────
  try {
    await app.listen({ port: config.PORT, host: "0.0.0.0" });
    console.log(`[server] Listening on http://0.0.0.0:${config.PORT}`);

    // Start the chain watcher after the server is up
    await startWatcher();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[server] Fatal:", err);
  process.exit(1);
});
