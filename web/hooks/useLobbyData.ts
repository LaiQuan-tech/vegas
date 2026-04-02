'use client';

import { useReadContracts } from 'wagmi';
import { ADDRESSES, factoryAbi } from '@/lib/contracts';

/**
 * Reads lobby data from the Factory contract:
 *  - getTableStates() — all active tables with player counts, max bets, etc.
 *  - getTableCount()  — total number of tables
 *
 * Polls every 10 seconds.
 */
export function useLobbyData() {
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
    },
  });

  const [tableStates, tableCount] = data ?? [];

  return {
    tables: tableStates?.result,
    tableCount: tableCount?.result,
    isLoading,
    isError,
    refetch,
  };
}
