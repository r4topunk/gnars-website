export const SUPPORTED_CHAINS = {
  BASE: 8453,
  ARBITRUM: 42161,
} as const;

export const CHAIN_NAMES = {
  8453: 'Base',
  42161: 'Arbitrum',
} as const;

export function getExplorerUrl(chainId: number, address: string): string {
  const explorers: Record<number, string> = {
    8453: 'https://basescan.org',
    42161: 'https://arbiscan.io',
  };
  return `${explorers[chainId] || 'https://etherscan.io'}/address/${address}`;
}
