import type { WSMessage, WSMessageType } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001/ws';

/** Reconnect ceiling in milliseconds */
export const MAX_RECONNECT_DELAY = 30_000;

/** Base reconnect delay in milliseconds */
export const BASE_RECONNECT_DELAY = 1_000;

/** Interval between PING frames (ms) */
export const PING_INTERVAL = 25_000;

// ---------------------------------------------------------------------------
// Message helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse an incoming WebSocket data string into a typed WSMessage.
 * Returns `null` when the payload is malformed.
 */
export function parseWSMessage(data: string): WSMessage | null {
  try {
    const parsed = JSON.parse(data);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.type !== 'string'
    ) {
      return null;
    }

    return {
      type: parsed.type as WSMessageType,
      payload: parsed.payload ?? null,
      timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Build a JSON subscribe message for a specific table address.
 */
export function createSubscribeMessage(tableAddress: string): string {
  const msg: WSMessage<{ tableAddress: string }> = {
    type: 'subscribe',
    payload: { tableAddress },
    timestamp: Date.now(),
  };
  return JSON.stringify(msg);
}

/**
 * Build a JSON unsubscribe message for a specific table address.
 */
export function createUnsubscribeMessage(tableAddress: string): string {
  const msg: WSMessage<{ tableAddress: string }> = {
    type: 'unsubscribe',
    payload: { tableAddress },
    timestamp: Date.now(),
  };
  return JSON.stringify(msg);
}

/**
 * Build a PING keepalive message.
 */
export function createPingMessage(): string {
  const msg: WSMessage = {
    type: 'ping',
    payload: null,
    timestamp: Date.now(),
  };
  return JSON.stringify(msg);
}

/**
 * Calculate exponential backoff delay with jitter.
 * Formula: min(BASE * 2^attempt + jitter, MAX)
 */
export function getReconnectDelay(attempt: number): number {
  const exponential = BASE_RECONNECT_DELAY * Math.pow(2, attempt);
  const jitter = Math.random() * 500;
  return Math.min(exponential + jitter, MAX_RECONNECT_DELAY);
}
