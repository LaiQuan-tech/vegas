// ============================================================================
// CyberRoulette Shared Types
// Shared across frontend, backend, and bot
// ============================================================================

// ---------------------------------------------------------------------------
// Core Types
// ---------------------------------------------------------------------------

/** Heat level indicating how close a table is to liquidation */
export type HeatLevel = 'cold' | 'warm' | 'hot' | 'critical';

/** On-chain table state */
export interface TableState {
  address: string;
  slots: number;
  pot: bigint;
  player: string;
  timestamp: number;
  seatOpen: boolean;
}

/** Extended table state for UI display */
export interface TableDisplay extends TableState {
  tableId: string;
  heatLevel: HeatLevel;
  potFormatted: string;
  countdown: number;
  playerTruncated: string;
  watcherCount: number;
}

/** Result of a bet action */
export interface BetResult {
  success: boolean;
  txHash: string;
  slotsRemaining: number;
  potTotal: bigint;
  message: string;
}

/** Event emitted when a bet is placed */
export interface BetEvent {
  tableId: string;
  player: string;
  amount: bigint;
  slotsRemaining: number;
  potTotal: bigint;
  timestamp: number;
  txHash: string;
}

/** Subscription tier levels: 0=free, 1=basic, 2=pro, 3=whale */
export type SubscriptionLevel = 0 | 1 | 2 | 3;

/** User subscription data */
export interface UserSubscription {
  address: string;
  level: SubscriptionLevel;
  expiresAt: number;
  isActive: boolean;
}

/** WebSocket message types */
export type WSMessageType =
  | 'table_update'
  | 'bet_placed'
  | 'liquidation'
  | 'alert'
  | 'subscribe'
  | 'unsubscribe'
  | 'ping'
  | 'pong'
  | 'error';

/** WebSocket message envelope */
export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  timestamp: number;
}

/** Probability data for a table */
export interface ProbabilityData {
  tableId: string;
  slotsRemaining: number;
  liquidationProbability: number;
  expectedValue: number;
  potUnlockPercent: number;
  heatLevel: HeatLevel;
}

/** Alert payload sent via bot / notifications */
export interface AlertPayload {
  tableId: string;
  heatLevel: HeatLevel;
  slotsRemaining: number;
  potFormatted: string;
  countdown: number;
  message: string;
}

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Determine the heat level of a table based on remaining slots.
 *
 * - **cold**: 36 - 25 slots remaining
 * - **warm**: 24 - 11 slots remaining
 * - **hot**: 10 - 6 slots remaining
 * - **critical**: 5 - 1 slots remaining
 *
 * @param slots - Number of remaining open slots (1-36)
 * @returns The corresponding heat level
 */
export function getHeatLevel(slots: number): HeatLevel {
  if (slots >= 25) return 'cold';
  if (slots >= 11) return 'warm';
  if (slots >= 6) return 'hot';
  return 'critical';
}

/**
 * Format a USDC amount (6-decimal bigint) into a human-readable string.
 *
 * USDC uses 6 decimals on-chain, so `1_000_000n` equals `"1.00"`.
 *
 * @param amount - The raw USDC amount as a bigint (6 decimals)
 * @returns Formatted string like `"1,234.56"`
 *
 * @example
 * ```ts
 * formatUsdc(1_234_560_000n); // "1,234.56"
 * formatUsdc(500_000n);       // "0.50"
 * ```
 */
export function formatUsdc(amount: bigint): string {
  const DECIMALS = 6n;
  const DIVISOR = 10n ** DECIMALS;

  const isNegative = amount < 0n;
  const abs = isNegative ? -amount : amount;

  const whole = abs / DIVISOR;
  const fraction = abs % DIVISOR;

  // Pad fraction to 6 digits, then take first 2 for cents
  const fractionStr = fraction.toString().padStart(6, '0').slice(0, 2);

  // Add thousand separators to whole part
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const formatted = `${wholeStr}.${fractionStr}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Truncate an Ethereum address to a short display form.
 *
 * @param addr - Full Ethereum address (e.g. `"0x1234abcd...5678ef"`)
 * @returns Truncated form like `"0x1234...5678"`
 */
export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Calculate the number of seconds until a table is liquidated.
 *
 * Liquidation windows are tiered by remaining slots:
 *
 * | Slots Remaining | Window   |
 * |-----------------|----------|
 * | 36 - 20         | 48 hours |
 * | 19 - 10         | 12 hours |
 * | 9 - 2           | 1 hour   |
 * | 1               | 15 min   |
 *
 * @param slots - Number of remaining open slots (1-36)
 * @param lastBetTimestamp - Unix timestamp (seconds) of the last bet
 * @returns Seconds remaining until liquidation (minimum 0)
 */
export function getLiquidationCountdown(
  slots: number,
  lastBetTimestamp: number,
): number {
  let windowSeconds: number;

  if (slots >= 20) {
    windowSeconds = 48 * 60 * 60; // 48 hours
  } else if (slots >= 10) {
    windowSeconds = 12 * 60 * 60; // 12 hours
  } else if (slots >= 2) {
    windowSeconds = 1 * 60 * 60; // 1 hour
  } else {
    windowSeconds = 15 * 60; // 15 minutes
  }

  const deadline = lastBetTimestamp + windowSeconds;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, deadline - now);
}

/**
 * Calculate the percentage of the pot that is unlocked based on filled slots.
 *
 * Formula: `(36 - slots) / 36 * 100`
 *
 * When all 36 slots are open the pot is 0% unlocked; when only 1 slot
 * remains the pot is ~97.2% unlocked.
 *
 * @param slots - Number of remaining open slots (1-36)
 * @returns Unlock percentage (0 - 100)
 */
export function getPotUnlockPercent(slots: number): number {
  return ((36 - slots) / 36) * 100;
}
