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
/**
 * POIDH V3 contract addresses (confirmed by POIDH creator).
 * Base: https://basescan.org/address/0x5555fa783936c260f77385b4e153b9725fef1719
 * NOTE: 0xb502... is V2 (compromised) — do NOT use.
 */
export const POIDH_CONTRACTS: Record<number, `0x${string}`> = {
  8453:  '0x5555fa783936c260f77385b4e153b9725fef1719', // Base mainnet V3 ✅
  42161: '0x5555Fa783936C260f77385b4E153B9725feF1719', // Arbitrum V3 (verify before use)
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
