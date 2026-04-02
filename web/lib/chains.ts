import { base, baseSepolia } from 'wagmi/chains';
import { type Chain } from 'viem';

// ============================================================
// Chain Configurations — Base Mainnet + Base Sepolia
// ============================================================

export const baseMainnet: Chain = {
  ...base,
  rpcUrls: {
    default: {
      http: ['https://mainnet.base.org'],
    },
  },
};

export const baseSepoliaChain: Chain = {
  ...baseSepolia,
  rpcUrls: {
    default: {
      http: ['https://sepolia.base.org'],
    },
  },
};

export const supportedChains = [baseMainnet, baseSepoliaChain] as const;

// Default to Base Sepolia during development
export const defaultChain = baseSepoliaChain;
