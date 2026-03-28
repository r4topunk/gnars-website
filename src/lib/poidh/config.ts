export const SUPPORTED_CHAINS = {
  BASE: 8453,
  ARBITRUM: 42161,
} as const;

export const CHAIN_NAMES = {
  8453: 'Base',
  42161: 'Arbitrum',
} as const;

/**
 * POIDH V3 contract addresses.
 * Verify at: basescan.org / arbiscan.io before using in production.
 */
export const POIDH_CONTRACTS: Record<number, `0x${string}`> = {
  8453:  '0xb502c5856f7244dccdd0264a541cc25675353d39', // Base mainnet
  42161: '0x0aa50ce0d724cc28f8f7af4630c32377b4d5c27d', // Arbitrum
};

export function getExplorerUrl(chainId: number, address: string): string {
  const explorers: Record<number, string> = {
    8453: 'https://basescan.org',
    42161: 'https://arbiscan.io',
  };
  return `${explorers[chainId] || 'https://etherscan.io'}/address/${address}`;
}

export function getTxUrl(chainId: number, hash: string): string {
  const explorers: Record<number, string> = {
    8453: 'https://basescan.org',
    42161: 'https://arbiscan.io',
  };
  return `${explorers[chainId] || 'https://etherscan.io'}/tx/${hash}`;
}
