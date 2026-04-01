export const SUPPORTED_CHAINS = {
  BASE: 8453,
  ARBITRUM: 42161,
  // DEGEN: 666666666, // Uncomment when POIDH deploys V3 on Degen L3
} as const;

export const CHAIN_NAMES = {
  8453: 'Base',
  42161: 'Arbitrum',
  // 666666666: 'Degen', // Uncomment when POIDH deploys V3 on Degen L3
} as const;

/**
 * POIDH V3 contract addresses (confirmed by POIDH creator).
 * Base: https://basescan.org/address/0x5555fa783936c260f77385b4e153b9725fef1719
 * NOTE: 0xb502... is V2 (compromised) — do NOT use.
 *
 * To add Degen L3 (chainId 666666666) once POIDH deploys there:
 *   1. Add DEGEN to SUPPORTED_CHAINS above
 *   2. Add 666666666: 'Degen' to CHAIN_NAMES above
 *   3. Add the contract address below
 *   4. Add degen chain to wagmi config (src/lib/wagmi.ts)
 *   5. Add explorer URL to getExplorerUrl / getTxUrl
 */
export const POIDH_CONTRACTS: Record<number, `0x${string}`> = {
  8453:  '0x5555fa783936c260f77385b4e153b9725fef1719', // Base mainnet V3 ✅
  42161: '0x5555Fa783936C260f77385b4E153B9725feF1719', // Arbitrum V3 (verify before use)
  // 666666666: '0x...', // Degen L3 — add once POIDH deploys
};

export function getExplorerUrl(chainId: number, address: string): string {
  const explorers: Record<number, string> = {
    8453: 'https://basescan.org',
    42161: 'https://arbiscan.io',
    // 666666666: 'https://explorer.degen.tips',
  };
  return `${explorers[chainId] || 'https://etherscan.io'}/address/${address}`;
}

export function getTxUrl(chainId: number, hash: string): string {
  const explorers: Record<number, string> = {
    8453: 'https://basescan.org',
    42161: 'https://arbiscan.io',
    // 666666666: 'https://explorer.degen.tips',
  };
  return `${explorers[chainId] || 'https://etherscan.io'}/tx/${hash}`;
}
