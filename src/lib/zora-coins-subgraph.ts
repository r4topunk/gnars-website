/**
 * Zora Coins Subgraph Client
 *
 * Client for querying the Goldsky subgraph that indexes GNARS-paired coins
 * from Uniswap V4 Pool Manager Initialize events on Base.
 *
 * @see /subgraphs/zora-coins for the subgraph source
 */

import { unstable_cache } from "next/cache";

// Subgraph URL - set after deploying to Goldsky
const ZORA_COINS_SUBGRAPH_URL = process.env.NEXT_PUBLIC_ZORA_COINS_SUBGRAPH_URL || "";

/**
 * GNARS-paired coin from the subgraph
 */
export interface GnarsPairedCoin {
  id: string;
  coin: string;
  backingCurrency: string;
  poolId: string;
  fee: string;
  tickSpacing: number;
  hooks: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface SubgraphResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface GnarsPairedCoinsResponse {
  gnarsPairedCoins: GnarsPairedCoin[];
}

interface SubgraphMeta {
  _meta: {
    block: {
      number: number;
    };
    hasIndexingErrors?: boolean;
  };
}

async function querySubgraph<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!ZORA_COINS_SUBGRAPH_URL) {
    throw new Error(
      "NEXT_PUBLIC_ZORA_COINS_SUBGRAPH_URL is not configured. Deploy the subgraph first.",
    );
  }

  const response = await fetch(ZORA_COINS_SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error(`Subgraph request failed: ${response.status}`);
  }

  const json = (await response.json()) as SubgraphResponse<T>;

  if (json.errors?.length) {
    throw new Error(`Subgraph query error: ${json.errors.map((e) => e.message).join(", ")}`);
  }

  return json.data as T;
}

/**
 * Fetch GNARS-paired coins from the subgraph
 * These are content coins that use $GNARS as their backing currency
 *
 * Cached for 15 minutes via unstable_cache to avoid hitting the subgraph on every request.
 */
export const fetchGnarsPairedCoins = unstable_cache(
  async (options?: {
    first?: number;
    skip?: number;
    orderBy?: "blockNumber" | "blockTimestamp";
    orderDirection?: "asc" | "desc";
  }): Promise<GnarsPairedCoin[]> => {
    const {
      first = 100,
      skip = 0,
      orderBy = "blockNumber",
      orderDirection = "desc",
    } = options || {};

    const query = `
      query GnarsPairedCoins($first: Int!, $skip: Int!, $orderBy: GnarsPairedCoin_orderBy!, $orderDirection: OrderDirection!) {
        gnarsPairedCoins(
          first: $first
          skip: $skip
          orderBy: $orderBy
          orderDirection: $orderDirection
        ) {
          id
          coin
          backingCurrency
          poolId
          fee
          tickSpacing
          hooks
          blockNumber
          blockTimestamp
          transactionHash
        }
      }
    `;

    const result = await querySubgraph<GnarsPairedCoinsResponse>(query, {
      first,
      skip,
      orderBy,
      orderDirection,
    });

    return result.gnarsPairedCoins || [];
  },
  ["gnars-paired-coins"],
  { revalidate: 900, tags: ["gnars-paired-coins"] },
);

/**
 * Get a specific coin by its address
 */
export async function getGnarsPairedCoinByAddress(
  coinAddress: string,
): Promise<GnarsPairedCoin | null> {
  const query = `
    query GnarsPairedCoinByAddress($coin: Bytes!) {
      gnarsPairedCoins(
        first: 1
        where: { coin: $coin }
      ) {
        id
        coin
        backingCurrency
        poolId
        fee
        tickSpacing
        hooks
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `;

  const result = await querySubgraph<GnarsPairedCoinsResponse>(query, {
    coin: coinAddress.toLowerCase(),
  });

  return result.gnarsPairedCoins?.[0] ?? null;
}

/**
 * Get subgraph sync status
 */
export async function getSubgraphStatus(): Promise<{
  blockNumber: number;
  hasIndexingErrors: boolean;
}> {
  const query = `
    query SubgraphStatus {
      _meta {
        block {
          number
        }
        hasIndexingErrors
      }
    }
  `;

  const result = await querySubgraph<SubgraphMeta>(query);

  return {
    blockNumber: result._meta.block.number,
    hasIndexingErrors: result._meta.hasIndexingErrors || false,
  };
}
