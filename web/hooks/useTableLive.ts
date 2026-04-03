'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTableState } from './useTableState';
import { useWebSocket } from './useWebSocket';
import type { WSMessage, TableState, BetEvent } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionSource = 'ws' | 'rpc' | 'stale';

interface UseTableLiveReturn {
  /** Merged table slots count */
  slots: number | undefined;
  /** Current player address */
  currentPlayer: string | undefined;
  /** Max bet value */
  maxBet: bigint | undefined;
  /** Whether the seat is open for a new player */
  seatOpen: boolean | undefined;
  /** Legacy pot contract address */
  legacyPotAddress: string | undefined;
  /** Most recent bet event from WS (if any) */
  lastBet: BetEvent | null;
  /** Where the latest data came from */
  source: ConnectionSource;
  /** Whether WebSocket is connected */
  wsConnected: boolean;
  /** Whether on-chain data is loading */
  isLoading: boolean;
  /** Whether on-chain read errored */
  isError: boolean;
  /** Force an on-chain refresh */
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Combines on-chain polling (`useTableState`) with real-time WebSocket
 * updates (`useWebSocket`) for optimal latency and reliability.
 *
 * - WebSocket pushes arrive instantly and are applied immediately.
 * - On-chain polling continues as a fallback; if the socket disconnects
 *   the UI seamlessly degrades to RPC-only mode.
 * - Returns a `source` indicator so the UI can display connection quality.
 */
export function useTableLive(tableAddress?: `0x${string}`): UseTableLiveReturn {
  // On-chain polling (always active as a safety net)
  const chain = useTableState(tableAddress);

  // Real-time WebSocket (auto-subscribes to the table address)
  const { isConnected: wsConnected, tableUpdates } = useWebSocket({
    tableAddress,
    enabled: !!tableAddress,
  });

  // ------------------------------------------------------------------
  // WS overlay state — written whenever a relevant WS message arrives
  // ------------------------------------------------------------------

  const [wsSlots, setWsSlots] = useState<number | undefined>(undefined);
  const [wsPlayer, setWsPlayer] = useState<string | undefined>(undefined);
  const [wsSeatOpen, setWsSeatOpen] = useState<boolean | undefined>(undefined);
  const [lastBet, setLastBet] = useState<BetEvent | null>(null);

  // Track the timestamp of the latest WS update to decide freshness
  const lastWsUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!tableUpdates) return;

    const { type, payload, timestamp } = tableUpdates as WSMessage<Record<string, unknown>>;
    lastWsUpdateRef.current = timestamp;

    if (type === 'table_update') {
      if (typeof payload.slots === 'number') setWsSlots(payload.slots);
      if (typeof payload.player === 'string') setWsPlayer(payload.player);
      if (typeof payload.seatOpen === 'boolean') setWsSeatOpen(payload.seatOpen);
    }

    if (type === 'bet_placed') {
      setLastBet(payload as unknown as BetEvent);
      if (typeof payload.slotsRemaining === 'number') setWsSlots(payload.slotsRemaining);
      if (typeof payload.player === 'string') setWsPlayer(payload.player as string);
    }

    if (type === 'liquidation') {
      // After liquidation the table resets — clear WS overlay so chain
      // data takes over on next poll.
      setWsSlots(undefined);
      setWsPlayer(undefined);
      setWsSeatOpen(undefined);
    }
  }, [tableUpdates]);

  // Reset WS overlay when the table address changes
  useEffect(() => {
    setWsSlots(undefined);
    setWsPlayer(undefined);
    setWsSeatOpen(undefined);
    setLastBet(null);
    lastWsUpdateRef.current = 0;
  }, [tableAddress]);

  // ------------------------------------------------------------------
  // Determine data source
  // ------------------------------------------------------------------

  const source: ConnectionSource = useMemo(() => {
    if (wsConnected && lastWsUpdateRef.current > 0) return 'ws';
    if (!chain.isLoading && !chain.isError) return 'rpc';
    return 'stale';
  }, [wsConnected, chain.isLoading, chain.isError]);

  // ------------------------------------------------------------------
  // Merge: WS values take priority when available
  // ------------------------------------------------------------------

  const slots = wsSlots ?? (chain.slots !== undefined ? Number(chain.slots) : undefined);
  const currentPlayer = wsPlayer ?? (chain.currentPlayer as string | undefined);
  const seatOpen = wsSeatOpen ?? (chain.seatOpen as boolean | undefined);

  return {
    slots,
    currentPlayer,
    maxBet: chain.maxBet as bigint | undefined,
    seatOpen,
    legacyPotAddress: chain.legacyPotAddress as string | undefined,
    lastBet,
    source,
    wsConnected,
    isLoading: chain.isLoading,
    isError: chain.isError,
    refetch: chain.refetch,
  };
}
