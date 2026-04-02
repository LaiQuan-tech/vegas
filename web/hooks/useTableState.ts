'use client';

import { useReadContracts } from 'wagmi';
import { ADDRESSES, cyberRouletteAbi } from '@/lib/contracts';

/**
 * Batch-reads the full table state from a CyberRoulette contract.
 * Polls every 5 seconds to keep the UI in sync with on-chain state.
 */
export function useTableState(tableAddress?: `0x${string}`) {
  const address = tableAddress ?? ADDRESSES.cyberRoulette;

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      {
        address,
        abi: cyberRouletteAbi,
        functionName: 'currentSlots',
      },
      {
        address,
        abi: cyberRouletteAbi,
        functionName: 'currentPlayer',
      },
      {
        address,
        abi: cyberRouletteAbi,
        functionName: 'maxBet',
      },
      {
        address,
        abi: cyberRouletteAbi,
        functionName: 'seatOpen',
      },
      {
        address,
        abi: cyberRouletteAbi,
        functionName: 'legacyPot',
      },
    ],
    query: {
      refetchInterval: 5_000,
    },
  });

  const [slots, currentPlayer, maxBet, seatOpen, legacyPotAddr] = data ?? [];

  return {
    slots: slots?.result,
    currentPlayer: currentPlayer?.result,
    maxBet: maxBet?.result,
    seatOpen: seatOpen?.result,
    legacyPotAddress: legacyPotAddr?.result,
    isLoading,
    isError,
    refetch,
  };
}
