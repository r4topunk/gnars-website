// POIDH v3 Contract Configuration
// Same address on Base + Arbitrum

export const POIDH_ADDRESS = '0x5555Fa783936C260f77385b4E153B9725feF1719' as const;

export const SUPPORTED_CHAINS = {
  BASE: 8453,
  ARBITRUM: 42161,
} as const;

export const CHAIN_NAMES = {
  [SUPPORTED_CHAINS.BASE]: 'Base',
  [SUPPORTED_CHAINS.ARBITRUM]: 'Arbitrum',
} as const;

export const CHAIN_EXPLORERS = {
  [SUPPORTED_CHAINS.BASE]: 'https://basescan.org',
  [SUPPORTED_CHAINS.ARBITRUM]: 'https://arbiscan.io',
} as const;

export function getExplorerUrl(chainId: number, type: 'tx' | 'address', value: string): string {
  const baseUrl = CHAIN_EXPLORERS[chainId as keyof typeof CHAIN_EXPLORERS];
  if (!baseUrl) return '';
  return `${baseUrl}/${type}/${value}`;
}
