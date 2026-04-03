'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WSMessage } from '@/lib/types';
import {
  WS_URL,
  PING_INTERVAL,
  parseWSMessage,
  createSubscribeMessage,
  createUnsubscribeMessage,
  createPingMessage,
  getReconnectDelay,
} from '@/lib/websocket';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseWebSocketOptions {
  /** Subscribe to updates for a specific table address */
  tableAddress?: string;
  /** Auto-connect on mount (default: true) */
  enabled?: boolean;
}

interface UseWebSocketReturn {
  /** Whether the socket is currently open */
  isConnected: boolean;
  /** Most recent parsed message from the server */
  lastMessage: WSMessage | null;
  /** Most recent table_update, bet_placed, or liquidation message */
  tableUpdates: WSMessage | null;
  /** Send an arbitrary string payload through the socket */
  sendMessage: (data: string) => void;
}

// ---------------------------------------------------------------------------
// Table-related message types we surface via `tableUpdates`
// ---------------------------------------------------------------------------

const TABLE_MESSAGE_TYPES = new Set([
  'table_update',
  'bet_placed',
  'liquidation',
  'alert',
]);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWebSocket(
  options: UseWebSocketOptions = {},
): UseWebSocketReturn {
  const { tableAddress, enabled = true } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [tableUpdates, setTableUpdates] = useState<WSMessage | null>(null);

  // Refs that survive across renders without triggering re-renders
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const tableAddressRef = useRef(tableAddress);

  // Keep tableAddressRef in sync so callbacks always read the latest value
  tableAddressRef.current = tableAddress;

  // -------------------------------------------------------------------
  // Cleanup helpers
  // -------------------------------------------------------------------

  const clearPingTimer = useCallback(() => {
    if (pingTimerRef.current !== null) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------
  // Send wrapper (stable reference)
  // -------------------------------------------------------------------

  const sendMessage = useCallback((data: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }, []);

  // -------------------------------------------------------------------
  // Core connect / reconnect logic
  // -------------------------------------------------------------------

  const connect = useCallback(() => {
    // Guard: don't connect if unmounted or disabled
    if (!mountedRef.current || !enabled) return;

    // Tear down any existing socket before creating a new one
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    // ---- onopen -------------------------------------------------------
    ws.onopen = () => {
      if (!mountedRef.current) return;

      setIsConnected(true);
      reconnectAttemptRef.current = 0;

      // Subscribe to a specific table if provided
      if (tableAddressRef.current) {
        ws.send(createSubscribeMessage(tableAddressRef.current));
      }

      // Start PING keepalive
      clearPingTimer();
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(createPingMessage());
        }
      }, PING_INTERVAL);
    };

    // ---- onmessage ----------------------------------------------------
    ws.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;

      const msg = parseWSMessage(
        typeof event.data === 'string' ? event.data : String(event.data),
      );
      if (!msg) return;

      // Silently swallow PONG replies — they are keepalive acknowledgments
      if (msg.type === 'pong') return;

      setLastMessage(msg);

      // Surface table-related messages, optionally filtered by address
      if (TABLE_MESSAGE_TYPES.has(msg.type)) {
        const payload = msg.payload as Record<string, unknown> | null;
        const msgTable =
          payload && typeof payload === 'object'
            ? (payload.tableAddress as string | undefined) ??
              (payload.tableId as string | undefined)
            : undefined;

        // If a table filter is active, only forward matching messages
        if (
          !tableAddressRef.current ||
          !msgTable ||
          msgTable.toLowerCase() === tableAddressRef.current.toLowerCase()
        ) {
          setTableUpdates(msg);
        }
      }
    };

    // ---- onerror ------------------------------------------------------
    ws.onerror = () => {
      // The browser fires `onerror` before `onclose` — nothing special needed
    };

    // ---- onclose ------------------------------------------------------
    ws.onclose = () => {
      if (!mountedRef.current) return;

      setIsConnected(false);
      clearPingTimer();

      // Schedule a reconnect with exponential backoff
      const delay = getReconnectDelay(reconnectAttemptRef.current);
      reconnectAttemptRef.current += 1;

      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [enabled, clearPingTimer, clearReconnectTimer]);

  // -------------------------------------------------------------------
  // Handle table address changes (re-subscribe)
  // -------------------------------------------------------------------

  const prevTableRef = useRef(tableAddress);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Unsubscribe from the old table
    if (prevTableRef.current) {
      ws.send(createUnsubscribeMessage(prevTableRef.current));
    }

    // Subscribe to the new table
    if (tableAddress) {
      ws.send(createSubscribeMessage(tableAddress));
    }

    prevTableRef.current = tableAddress;
  }, [tableAddress]);

  // -------------------------------------------------------------------
  // Lifecycle: connect on mount, clean up on unmount
  // -------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      clearPingTimer();
      clearReconnectTimer();

      if (wsRef.current) {
        // Prevent the onclose handler from scheduling a reconnect
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connect, clearPingTimer, clearReconnectTimer]);

  return { isConnected, lastMessage, tableUpdates, sendMessage };
}
