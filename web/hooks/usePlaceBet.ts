'use client';

import { useCallback, useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';
import {
  ADDRESSES,
  cyberRouletteAbi,
  usdcAbi,
} from '@/lib/contracts';

/**
 * Handles the full placeBet flow:
 *  1. Check USDC allowance for the CyberRoulette contract
 *  2. If insufficient, send an approve tx and wait
 *  3. Call placeBet(amount) on the table contract
 */
export function usePlaceBet(tableAddress?: `0x${string}`) {
  const address = tableAddress ?? ADDRESSES.cyberRoulette;
  const { address: userAddress } = useAccount();

  const [step, setStep] = useState<'idle' | 'approving' | 'betting' | 'done' | 'error'>('idle');

  // Current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.usdc,
    abi: usdcAbi,
    functionName: 'allowance',
    args: userAddress ? [userAddress, address] : undefined,
    query: { enabled: !!userAddress },
  });

  const {
    writeContractAsync: writeApprove,
    isPending: isApproving,
  } = useWriteContract();

  const {
    writeContractAsync: writeBet,
    isPending: isBetting,
  } = useWriteContract();

  const placeBet = useCallback(
    async (amountUsdc: string) => {
      if (!userAddress) return;

      try {
        const amount = parseUnits(amountUsdc, 6); // USDC has 6 decimals

        // Step 1: Check allowance and approve if needed
        const currentAllowance = allowance ?? 0n;
        if (currentAllowance < amount) {
          setStep('approving');
          await writeApprove({
            address: ADDRESSES.usdc,
            abi: usdcAbi,
            functionName: 'approve',
            args: [address, amount],
          });
          await refetchAllowance();
        }

        // Step 2: Place the bet
        setStep('betting');
        await writeBet({
          address,
          abi: cyberRouletteAbi,
          functionName: 'placeBet',
          args: [amount],
        });

        setStep('done');
      } catch (err) {
        console.error('placeBet failed:', err);
        setStep('error');
      }
    },
    [userAddress, address, allowance, writeApprove, writeBet, refetchAllowance],
  );

  return {
    placeBet,
    step,
    isApproving,
    isBetting,
    isPending: isApproving || isBetting,
    allowance,
  };
}
