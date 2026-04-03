// ============================================================
// CyberRoulette Contract ABIs & Addresses
// ============================================================

// ---- Contract addresses (configurable via environment variables) ----
export const ADDRESSES = {
  cyberRoulette: (process.env.NEXT_PUBLIC_CYBER_ROULETTE_ADDRESS ??
    '0x0000000000000000000000000000000000000001') as `0x${string}`,
  legacyPot: (process.env.NEXT_PUBLIC_LEGACY_POT_ADDRESS ??
    '0x0000000000000000000000000000000000000002') as `0x${string}`,
  factory: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
    '0x0000000000000000000000000000000000000003') as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') as `0x${string}`, // USDC on Base
} as const;

// ---- CyberRoulette ABI ----
export const cyberRouletteAbi = [
  // --- Read ---
  {
    type: 'function',
    name: 'currentSlots',
    inputs: [],
    outputs: [
      {
        type: 'tuple[]',
        name: '',
        components: [
          { name: 'player', type: 'address' },
          { name: 'betAmount', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'legacyPot',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'currentPlayer',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxBet',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'seatOpen',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },

  // --- Write ---
  {
    type: 'function',
    name: 'placeBet',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'abandonSeat',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimSeat',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'rebalance',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // --- Events ---
  {
    type: 'event',
    name: 'BetPlaced',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'slot', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SeatClaimed',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'SeatAbandoned',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'RoundComplete',
    inputs: [
      { name: 'winner', type: 'address', indexed: true },
      { name: 'payout', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Rebalanced',
    inputs: [
      { name: 'caller', type: 'address', indexed: true },
    ],
  },
] as const;

// ---- LegacyPot ABI ----
export const legacyPotAbi = [
  {
    type: 'function',
    name: 'totalPot',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'calculatePotShare',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// ---- Factory ABI ----
export const factoryAbi = [
  {
    type: 'function',
    name: 'getTableStates',
    inputs: [],
    outputs: [
      {
        type: 'tuple[]',
        name: '',
        components: [
          { name: 'tableAddress', type: 'address' },
          { name: 'playerCount', type: 'uint256' },
          { name: 'maxBet', type: 'uint256' },
          { name: 'seatOpen', type: 'bool' },
          { name: 'currentPlayer', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTableCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// ---- USDC (ERC-20 subset) ABI ----
export const usdcAbi = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
