-- CyberRoulette database schema
-- Run: psql $DATABASE_URL -f src/db/schema.sql

BEGIN;

-- ──────────────────────────────────────────────
-- Users / subscribers
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  wallet          TEXT        NOT NULL,
  telegram_chat_id TEXT       NOT NULL,
  subscription_level INT     NOT NULL DEFAULT 1
    CHECK (subscription_level BETWEEN 1 AND 3),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wallet, telegram_chat_id)
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users (wallet);
CREATE INDEX IF NOT EXISTS idx_users_sub_level ON users (subscription_level);
CREATE INDEX IF NOT EXISTS idx_users_expires ON users (expires_at) WHERE expires_at IS NOT NULL;

-- ──────────────────────────────────────────────
-- Live table snapshots (one row per table)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS table_snapshots (
  id              SERIAL PRIMARY KEY,
  table_address   TEXT        NOT NULL UNIQUE,
  current_slots   INT         NOT NULL DEFAULT 36,
  legacy_pot      NUMERIC(78) NOT NULL DEFAULT 0,
  current_player  TEXT,
  seat_open       BOOLEAN     NOT NULL DEFAULT TRUE,
  last_bet_at     TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_slots ON table_snapshots (current_slots);
CREATE INDEX IF NOT EXISTS idx_snapshots_seat ON table_snapshots (seat_open);

-- ──────────────────────────────────────────────
-- Bet history (append-only ledger)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bet_history (
  id              SERIAL PRIMARY KEY,
  table_address   TEXT        NOT NULL,
  player          TEXT        NOT NULL,
  bet_number      INT         NOT NULL,
  bet_amount      NUMERIC(78) NOT NULL,
  result          INT         NOT NULL,
  won             BOOLEAN     NOT NULL,
  payout          NUMERIC(78) NOT NULL DEFAULT 0,
  pot_share       NUMERIC(78) NOT NULL DEFAULT 0,
  tx_hash         TEXT        NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bets_table ON bet_history (table_address);
CREATE INDEX IF NOT EXISTS idx_bets_player ON bet_history (player);
CREATE INDEX IF NOT EXISTS idx_bets_table_time ON bet_history (table_address, created_at DESC);

COMMIT;
