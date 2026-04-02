'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { ADDRESSES, usdcAbi } from '@/lib/contracts';

/**
 * Reads the USDC balance for the connected wallet.
 * Returns both the raw bigint and a formatted string (6 decimals).
 */
export function useUsdcBalance() {
  const { address } = useAccount();

  const { data: balance, isLoading, isError, refetch } = useReadContract({
    address: ADDRESSES.usdc,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10_000,
    },
  });

  return {
    balance,
    formatted: balance !== undefined ? formatUnits(balance, 6) : undefined,
    isLoading,
    isError,
    refetch,
  };
}
