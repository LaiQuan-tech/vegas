'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ADDRESSES, cyberRouletteAbi } from '@/lib/contracts';

/**
 * Calls claimSeat() on the CyberRoulette table contract.
 */
export function useClaimSeat(tableAddress?: `0x${string}`) {
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

  const claimSeat = () => {
    writeContract({
      address,
      abi: cyberRouletteAbi,
      functionName: 'claimSeat',
    });
  };

  const claimSeatAsync = () =>
    writeContractAsync({
      address,
      abi: cyberRouletteAbi,
      functionName: 'claimSeat',
    });

  return {
    claimSeat,
    claimSeatAsync,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error,
    reset,
  };
}
