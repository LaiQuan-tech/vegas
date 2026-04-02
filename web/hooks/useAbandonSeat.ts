'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ADDRESSES, cyberRouletteAbi } from '@/lib/contracts';

/**
 * Calls abandonSeat() on the CyberRoulette table contract.
 */
export function useAbandonSeat(tableAddress?: `0x${string}`) {
  const address = tableAddress ?? ADDRESSES.cyberRoulette;

  const {
    data: hash,
    writeContract,
    writeContractAsync,
    isPending,
    isError,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const abandonSeat = () => {
    writeContract({
      address,
      abi: cyberRouletteAbi,
      functionName: 'abandonSeat',
    });
  };

  const abandonSeatAsync = () =>
    writeContractAsync({
      address,
      abi: cyberRouletteAbi,
      functionName: 'abandonSeat',
    });

  return {
    abandonSeat,
    abandonSeatAsync,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
    reset,
  };
}
