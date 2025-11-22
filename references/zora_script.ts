/**
 * DAO Portfolio Management
 * 
 * This module provides helpers for managing the DAO's Zora creator coin holdings.
 * It uses the Zora Coins SDK to fetch and normalize portfolio data.
 */

import {
    setApiKey,
    getProfileBalances,
    type GetProfileBalancesQuery,
  } from '@zoralabs/coins-sdk';
  
  // ============================================
  // Types
  // ============================================
  
  export type DaoCoinHolding = {
    coinId: string;           // contract address or canonical id
    symbol?: string;
    name?: string;
    balanceRaw: string;       // onchain units (raw balance)
    balanceUsd?: number | null;
  };
  
  // Internal SDK response type (inferred from runtime structure)
  interface BalanceEdge {
    node?: {
      balance?: string;
      id?: string;
      coin?: {
        id?: string;
        address?: string;
        symbol?: string;
        name?: string;
        tokenPrice?: {
          priceInUsdc?: string;
        };
        marketCap?: string;
      };
      // Fallback fields if structured differently
      token?: {
        id?: string;
        address?: string;
        symbol?: string;
        name?: string;
      };
      amount?: string;
      balanceUsd?: number;
      usdValue?: number;
    };
  }
  
  interface ProfileBalancesData {
    profile?: {
      coinBalances?: {
        count?: number;
        edges?: BalanceEdge[];
        pageInfo?: {
          hasNextPage?: boolean;
          endCursor?: string | null;
        };
      };
    };
    balances?: {
      edges?: BalanceEdge[];
    };
  }
  
  // ============================================
  // Helper Functions
  // ============================================
  
  /**
   * Initialize Zora SDK with API key
   * Reuses initialization pattern from lib/zora.ts
   */
  function initializeZoraSDK(): void {
    const apiKey = process.env.ZORA_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        'ZORA_API_KEY is not configured. Please add it to your .env.local file.'
      );
    }
    
    setApiKey(apiKey);
  }
  
  /**
   * Normalize balance data from Zora API response
   */
  function normalizeBalanceData(balances: BalanceEdge[]): DaoCoinHolding[] {
    return balances.map((balance) => {
      const node = balance.node;
      // The coin data is in node.coin, not node.token
      const coinData = node?.coin;
      const tokenData = node?.token;
      
      // Calculate USD value from balance and price
      let balanceUsd: number | null = null;
      if (node?.balance && coinData?.tokenPrice?.priceInUsdc) {
        const rawBalance = BigInt(node.balance);
        const priceUsd = parseFloat(coinData.tokenPrice.priceInUsdc);
        // Assuming 18 decimals for the token
        const balance = Number(rawBalance) / 1e18;
        balanceUsd = balance * priceUsd;
      }
      
      return {
        coinId: coinData?.id || coinData?.address || tokenData?.id || tokenData?.address || 'unknown',
        symbol: coinData?.symbol || tokenData?.symbol || undefined,
        name: coinData?.name || tokenData?.name || undefined,
        balanceRaw: node?.balance || node?.amount || '0',
        balanceUsd: balanceUsd || node?.balanceUsd || node?.usdValue || null,
      };
    });
  }
  
  // ============================================
  // Main Export
  // ============================================
  
  /**
   * Get all Zora creator coin holdings for a DAO address
   * 
   * @param daoAddress - The DAO's wallet address (0x...)
   * @returns Array of coin holdings with balances and metadata
   * @throws Error if ZORA_API_KEY is missing or API call fails
   * 
   * @example
   * ```typescript
   * const holdings = await getDaoCoinHoldings('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
   * holdings.forEach(h => {
   *   console.log(`${h.name}: ${h.balanceRaw} (${h.balanceUsd} USD)`);
   * });
   * ```
   */
  export async function getDaoCoinHoldings(
    daoAddress: string
  ): Promise<DaoCoinHolding[]> {
    // Validate input
    if (!daoAddress) {
      throw new Error('DAO address is required');
    }
  
    if (!daoAddress.startsWith('0x')) {
      throw new Error('DAO address must be a valid Ethereum address (0x...)');
    }
  
    // Initialize Zora SDK
    initializeZoraSDK();
  
    try {
      // Query profile balances from Zora API
      const query: GetProfileBalancesQuery = {
        identifier: daoAddress,
        count: 100, // Fetch up to 100 holdings
        sortOption: 'BALANCE',
        excludeHidden: false,
      };
  
      const response = await getProfileBalances(query);
  
      // Check if response has data
      const responseWithData = response as { data?: ProfileBalancesData };
      if (!response || !responseWithData.data) {
        console.warn('⚠️  No response data from Zora API for', daoAddress);
        return [];
      }
  
      // Extract balances from response
      const responseData = responseWithData.data;
      const balancesList = responseData.profile?.coinBalances?.edges || [];
  
      if (balancesList.length === 0) {
        return [];
      }
  
      // Normalize the balance data
      const holdings = normalizeBalanceData(balancesList);
  
      return holdings;
  
    } catch (error: unknown) {
      console.error('❌ Error fetching DAO coin holdings:', error);
  
      if (error instanceof Error && error.message.includes('ZORA_API_KEY')) {
        throw error; // Re-throw API key errors
      }
  
      throw new Error(
        `Failed to fetch coin holdings for ${daoAddress}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
  
  /**
   * Get total USD value of DAO's coin portfolio
   * 
   * @param daoAddress - The DAO's wallet address
   * @returns Total portfolio value in USD, or null if unavailable
   */
  export async function getDaoPortfolioValue(
    daoAddress: string
  ): Promise<number | null> {
    try {
      const holdings = await getDaoCoinHoldings(daoAddress);
      
      const totalValue = holdings.reduce(
        (sum, holding) => sum + (holding.balanceUsd || 0),
        0
      );
  
      return totalValue > 0 ? totalValue : null;
    } catch (error: unknown) {
      console.error('❌ Error calculating portfolio value:', error);
      return null;
    }
  }
  
  /**
   * Check if DAO holds a specific coin
   * 
   * @param daoAddress - The DAO's wallet address
   * @param coinIdOrAddress - Coin ID or contract address to check
   * @returns The holding if found, null otherwise
   */
  export async function getDaoHoldingForCoin(
    daoAddress: string,
    coinIdOrAddress: string
  ): Promise<DaoCoinHolding | null> {
    try {
      const holdings = await getDaoCoinHoldings(daoAddress);
      
      const holding = holdings.find(
        h => h.coinId === coinIdOrAddress || 
             h.coinId.toLowerCase().includes(coinIdOrAddress.toLowerCase())
      );
  
      return holding || null;
    } catch (error: unknown) {
      console.error('❌ Error checking coin holding:', error);
      return null;
    }
  }
  