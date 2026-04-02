import type { FastifyInstance } from "fastify";
import type { WebSocket, RawData } from "ws";
import { getAllSnapshots, type TableSnapshot } from "./db/index.js";

// ── Message types ────────────────────────────

export type WsMessageType =
  | "TABLE_UPDATE"
  | "SEAT_OPEN"
  | "SLOT_REDUCED"
  | "POT_WON"
  | "SYSTEM_WIPE";

export interface WsMessage {
  type: WsMessageType;
  table: string;
  data: Record<string, unknown>;
  ts: number;
}

// ── Client registry ──────────────────────────

const clients = new Set<WebSocket>();

function removeClient(ws: WebSocket): void {
  clients.delete(ws);
  console.log(`[ws] Client disconnected (${clients.size} active)`);
}

// ── Public API ───────────────────────────────

/**
 * Broadcast a message to every connected WebSocket client.
 */
export function broadcast(type: WsMessageType, table: string, data: Record<string, unknown>): void {
  const msg: WsMessage = { type, table, data, ts: Date.now() };
  const payload = JSON.stringify(msg);

  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

/**
 * Send the full table state to a single client on connect.
 */
async function sendInitialState(ws: WebSocket): Promise<void> {
  try {
    const snapshots = await getAllSnapshots();
    const msg = {
      type: "INITIAL_STATE" as const,
      tables: snapshots,
      ts: Date.now(),
    };
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  } catch (err) {
    console.error("[ws] Failed to send initial state:", err);
  }
}

/**
 * Register the WebSocket route on the Fastify instance.
 * Clients connect to ws://host:port/ws
 */
export async function registerWebSocket(app: FastifyInstance): Promise<void> {
  app.get("/ws", { websocket: true }, (socket, _req) => {
    const ws = socket as unknown as WebSocket;

    clients.add(ws);
    console.log(`[ws] Client connected (${clients.size} active)`);

    // Send current state immediately
    void sendInitialState(ws);

    ws.on("message", (raw: RawData) => {
      // Clients can send a ping to keep alive
      try {
        const msg = JSON.parse(raw.toString()) as { type?: string };
        if (msg.type === "PING") {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: "PONG", ts: Date.now() }));
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on("close", () => removeClient(ws));
    ws.on("error", (err: Error) => {
      console.error("[ws] Socket error:", err.message);
      removeClient(ws);
    });
  });
}

/**
 * Convenience: broadcast a full TABLE_UPDATE with snapshot data.
 */
export function broadcastTableUpdate(snapshot: TableSnapshot): void {
  broadcast("TABLE_UPDATE", snapshot.table_address, {
    current_slots: snapshot.current_slots,
    legacy_pot: snapshot.legacy_pot,
    current_player: snapshot.current_player,
    seat_open: snapshot.seat_open,
    last_bet_at: snapshot.last_bet_at,
  });
}
