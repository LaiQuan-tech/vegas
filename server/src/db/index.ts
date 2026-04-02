import pg from "pg";
import { config } from "../config.js";

const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err.message);
});

// ── generic helpers ──────────────────────────

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const ms = Date.now() - start;
  if (ms > 200) {
    console.warn(`[db] Slow query (${ms}ms):`, text.slice(0, 120));
  }
  return result;
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const { rows } = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function queryMany<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const { rows } = await query<T>(text, params);
  return rows;
}

// ── table snapshot helpers ───────────────────

export interface TableSnapshot {
  table_address: string;
  current_slots: number;
  legacy_pot: string;
  current_player: string | null;
  seat_open: boolean;
  last_bet_at: string | null;
  updated_at: string;
}

export async function upsertSnapshot(
  tableAddress: string,
  fields: Partial<Omit<TableSnapshot, "table_address" | "updated_at">>,
): Promise<TableSnapshot> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 2; // $1 = table_address

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      sets.push(`${key} = $${idx}`);
      vals.push(value);
      idx++;
    }
  }

  sets.push("updated_at = NOW()");

  const insertCols = ["table_address", ...Object.keys(fields).filter((k) => fields[k as keyof typeof fields] !== undefined)];
  const insertPlaceholders = insertCols.map((_, i) => `$${i + 1}`);

  const sql = `
    INSERT INTO table_snapshots (${insertCols.join(", ")}, updated_at)
    VALUES (${insertPlaceholders.join(", ")}, NOW())
    ON CONFLICT (table_address) DO UPDATE SET ${sets.join(", ")}
    RETURNING *
  `;

  const row = await queryOne<TableSnapshot>(sql, [tableAddress, ...vals]);
  return row!;
}

export async function getSnapshot(tableAddress: string): Promise<TableSnapshot | null> {
  return queryOne<TableSnapshot>(
    "SELECT * FROM table_snapshots WHERE table_address = $1",
    [tableAddress],
  );
}

export async function getAllSnapshots(): Promise<TableSnapshot[]> {
  return queryMany<TableSnapshot>(
    "SELECT * FROM table_snapshots ORDER BY current_slots ASC, updated_at DESC",
  );
}

// ── bet history helpers ──────────────────────

export interface BetRecord {
  id: number;
  table_address: string;
  player: string;
  bet_number: number;
  bet_amount: string;
  result: number;
  won: boolean;
  payout: string;
  pot_share: string;
  tx_hash: string;
  created_at: string;
}

export async function insertBet(bet: Omit<BetRecord, "id" | "created_at">): Promise<BetRecord> {
  const sql = `
    INSERT INTO bet_history (table_address, player, bet_number, bet_amount, result, won, payout, pot_share, tx_hash)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (tx_hash) DO NOTHING
    RETURNING *
  `;
  const row = await queryOne<BetRecord>(sql, [
    bet.table_address,
    bet.player,
    bet.bet_number,
    bet.bet_amount,
    bet.result,
    bet.won,
    bet.payout,
    bet.pot_share,
    bet.tx_hash,
  ]);
  return row!;
}

export async function getHistory(
  tableAddress: string,
  limit = 50,
  offset = 0,
): Promise<BetRecord[]> {
  return queryMany<BetRecord>(
    "SELECT * FROM bet_history WHERE table_address = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    [tableAddress, limit, offset],
  );
}

// ── user / subscriber helpers ────────────────

export interface UserRow {
  id: number;
  wallet: string;
  telegram_chat_id: string;
  subscription_level: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function upsertUser(
  wallet: string,
  telegramChatId: string,
  subscriptionLevel: number,
  expiresAt: Date | null,
): Promise<UserRow> {
  const sql = `
    INSERT INTO users (wallet, telegram_chat_id, subscription_level, expires_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (wallet, telegram_chat_id)
    DO UPDATE SET subscription_level = $3, expires_at = $4, updated_at = NOW()
    RETURNING *
  `;
  const row = await queryOne<UserRow>(sql, [wallet, telegramChatId, subscriptionLevel, expiresAt]);
  return row!;
}

export async function getSubscribersByWallet(wallet: string): Promise<UserRow[]> {
  return queryMany<UserRow>(
    "SELECT * FROM users WHERE wallet = $1 ORDER BY created_at DESC",
    [wallet],
  );
}

export async function deleteSubscriber(wallet: string): Promise<boolean> {
  const result = await query("DELETE FROM users WHERE wallet = $1", [wallet]);
  return (result.rowCount ?? 0) > 0;
}

export async function getActiveSubscribers(minLevel: number): Promise<UserRow[]> {
  return queryMany<UserRow>(
    `SELECT * FROM users
     WHERE subscription_level >= $1
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [minLevel],
  );
}

// ── lifecycle ────────────────────────────────

export async function closePool(): Promise<void> {
  await pool.end();
}
