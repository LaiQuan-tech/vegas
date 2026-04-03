'use client';

import { useReadContracts } from 'wagmi';
import { ADDRESSES, factoryAbi } from '@/lib/contracts';
import { type TableState } from '@/lib/types';

// ----------------------------------------------------------------
// Placeholder detection
// ----------------------------------------------------------------
const PLACEHOLDER_FACTORY = '0x0000000000000000000000000000000000000003';

// ----------------------------------------------------------------
// Mock data — shown when contracts are not yet deployed
// ----------------------------------------------------------------
function buildMockTables(): TableState[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      // CRITICAL (3 slots, 10 min countdown)
      address: '0x1111111111111111111111111111111111111111',
      slots: 3,
      pot: 5_420_000n, // $5.42 USDC
      player: '0xaBcD1234567890AbCd1234567890abcd12345678',
      timestamp: now - 480, // bet 8 min ago → 7 min left (15 min window)
      seatOpen: false,
    },
    {
      // HOT (8 slots, 25 min countdown)
      address: '0x2222222222222222222222222222222222222222',
      slots: 8,
      pot: 2_150_000n, // $2.15 USDC
      player: '0xDEaD0000000000000000000000000000DeAd0001',
      timestamp: now - 2100, // bet 35 min ago → 25 min left (1 hr window)
      seatOpen: true,
    },
    {
      // WARM (18 slots, 9h countdown)
      address: '0x3333333333333333333333333333333333333333',
      slots: 18,
      pot: 980_000n, // $0.98 USDC
      player: '0xFeed000000000000000000000000000000FeeD02',
      timestamp: now - 10_800, // bet 3 hrs ago → 9 hrs left (12 hr window)
      seatOpen: true,
    },
    {
      // COLD (34 slots, fresh)
      address: '0x4444444444444444444444444444444444444444',
      slots: 34,
      pot: 100_000n, // $0.10 USDC
      player: '0x0000000000000000000000000000000000000000',
      timestamp: now - 43_200, // bet 12 hrs ago → 36 hrs left (48 hr window)
      seatOpen: true,
    },
  ];
}

/**
 * Reads lobby data from the Factory contract:
 *  - getTableStates() — all active tables with player counts, max bets, etc.
 *  - getTableCount()  — total number of tables
 *
 * Falls back to mock data when the factory address is the default placeholder
 * (i.e., smart contracts have not yet been deployed).
 *
 * Polls every 10 seconds.
 */
export function useLobbyData() {
  const isPlaceholder = ADDRESSES.factory === PLACEHOLDER_FACTORY;

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      {
        address: ADDRESSES.factory,
        abi: factoryAbi,
        functionName: 'getTableStates',
      },
      {
        address: ADDRESSES.factory,
        abi: factoryAbi,
        functionName: 'getTableCount',
      },
    ],
    query: {
      refetchInterval: 10_000,
      enabled: !isPlaceholder,
    },
  });

  // ── Mock mode (contracts not yet deployed) ───────────────────────────────
  if (isPlaceholder) {
    const mockTables = buildMockTables();
    return {
      tables: mockTables,
      tableCount: BigInt(mockTables.length),
      isLoading: false,
      isError: false,
      refetch: async () => {},
    };
  }

  // ── Live mode ─────────────────────────────────────────────────────────────
  const [tableStates, tableCount] = data ?? [];

  return {
    tables: tableStates?.result,
    tableCount: tableCount?.result,
    isLoading,
    isError,
    refetch,
  };
}
