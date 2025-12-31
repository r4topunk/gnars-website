/**
 * Zora Coins Subgraph Client
 *
 * Client for querying the Goldsky subgraph that indexes CoinCreatedV4 events
 * from the Zora Factory contract on Base.
 *
 * @see /subgraphs/zora-coins/README.md for setup instructions
 */

import { GNARS_CREATOR_COIN, GNARS_ADDRESSES } from "@/lib/config";

// Subgraph URL - set after deploying to Goldsky
const ZORA_COINS_SUBGRAPH_URL =
  process.env.NEXT_PUBLIC_ZORA_COINS_SUBGRAPH_URL || "";

export interface ZoraCoinCreated {
  id: string;
  caller: string;
  coin: string;
  name: string;
  symbol: string;
  uri: string;
  currency: string;
  payoutRecipient: string;
  platformReferrer: string;
  poolKeyHash: string;
  version: string;
  block_number: string;
  timestamp_: string;
  transactionHash_: string;
  // Pool key fields (flattened by Goldsky)
  poolKey_currency0: string;
  poolKey_currency1: string;
  poolKey_fee: string;
  poolKey_tickSpacing: number;
  poolKey_hooks: string;
}

interface SubgraphResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface CoinCreatedV4sResponse {
  coinCreatedV4S: ZoraCoinCreated[];
}

async function querySubgraph<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!ZORA_COINS_SUBGRAPH_URL) {
    throw new Error(
      "NEXT_PUBLIC_ZORA_COINS_SUBGRAPH_URL is not configured. Deploy the subgraph first."
    );
  }

  const response = await fetch(ZORA_COINS_SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Subgraph request failed: ${response.status}`);
  }

  const json = (await response.json()) as SubgraphResponse<T>;

  if (json.errors?.length) {
    throw new Error(
      `Subgraph query error: ${json.errors.map((e) => e.message).join(", ")}`
    );
  }

  return json.data as T;
}

/**
 * Fetch coins paired with Gnars Creator Coin
 * These are content coins that use $GNARS as their backing currency
 */
export async function getGnarsPairedCoins(
  first: number = 50,
  skip: number = 0
): Promise<ZoraCoinCreated[]> {
  const query = `
    query GnarsPairedCoins($first: Int!, $skip: Int!, $currency: String!) {
      coinCreatedV4S(
        first: $first
        skip: $skip
        where: { currency: $currency }
        orderBy: block_number
        orderDirection: desc
      ) {
        id
        caller
        coin
        name
        symbol
        uri
        currency
        payoutRecipient
        platformReferrer
        poolKeyHash
        version
        block_number
        timestamp_
        transactionHash_
        poolKey_currency0
        poolKey_currency1
        poolKey_fee
        poolKey_tickSpacing
        poolKey_hooks
      }
    }
  `;

  const result = await querySubgraph<CoinCreatedV4sResponse>(query, {
    first,
    skip,
    currency: GNARS_CREATOR_COIN.toLowerCase(),
  });

  return result.coinCreatedV4S;
}

/**
 * Fetch coins created with Gnars as platform referrer
 * These are coins where Gnars treasury receives referral rewards
 */
export async function getGnarsReferredCoins(
  first: number = 50,
  skip: number = 0
): Promise<ZoraCoinCreated[]> {
  const query = `
    query GnarsReferredCoins($first: Int!, $skip: Int!, $referrer: String!) {
      coinCreatedV4S(
        first: $first
        skip: $skip
        where: { platformReferrer: $referrer }
        orderBy: block_number
        orderDirection: desc
      ) {
        id
        caller
        coin
        name
        symbol
        uri
        currency
        payoutRecipient
        platformReferrer
        poolKeyHash
        version
        block_number
        timestamp_
        transactionHash_
      }
    }
  `;

  const result = await querySubgraph<CoinCreatedV4sResponse>(query, {
    first,
    skip,
    referrer: GNARS_ADDRESSES.treasury.toLowerCase(),
  });

  return result.coinCreatedV4S;
}

/**
 * Fetch coins created by a specific address
 */
export async function getCoinsByCreator(
  creator: string,
  first: number = 50,
  skip: number = 0
): Promise<ZoraCoinCreated[]> {
  const query = `
    query CoinsByCreator($first: Int!, $skip: Int!, $creator: String!) {
      coinCreatedV4S(
        first: $first
        skip: $skip
        where: { caller: $creator }
        orderBy: block_number
        orderDirection: desc
      ) {
        id
        caller
        coin
        name
        symbol
        uri
        currency
        payoutRecipient
        platformReferrer
        poolKeyHash
        version
        block_number
        timestamp_
        transactionHash_
      }
    }
  `;

  const result = await querySubgraph<CoinCreatedV4sResponse>(query, {
    first,
    skip,
    creator: creator.toLowerCase(),
  });

  return result.coinCreatedV4S;
}

/**
 * Get a specific coin by its address
 */
export async function getCoinByAddress(
  coinAddress: string
): Promise<ZoraCoinCreated | null> {
  const query = `
    query CoinByAddress($coin: String!) {
      coinCreatedV4S(
        first: 1
        where: { coin: $coin }
      ) {
        id
        caller
        coin
        name
        symbol
        uri
        currency
        payoutRecipient
        platformReferrer
        poolKeyHash
        version
        block_number
        timestamp_
        transactionHash_
      }
    }
  `;

  const result = await querySubgraph<CoinCreatedV4sResponse>(query, {
    coin: coinAddress.toLowerCase(),
  });

  return result.coinCreatedV4S[0] ?? null;
}

/**
 * Check if a coin is paired with Gnars Creator Coin
 */
export async function isGnarsPairedCoin(coinAddress: string): Promise<boolean> {
  const coin = await getCoinByAddress(coinAddress);
  if (!coin) return false;
  return coin.currency.toLowerCase() === GNARS_CREATOR_COIN.toLowerCase();
}

/**
 * Get total count of Gnars paired coins
 */
export async function getGnarsPairedCoinsCount(): Promise<number> {
  // The Graph doesn't support direct count, so we paginate
  // For a more efficient count, consider adding a counter entity in a custom subgraph
  let total = 0;
  let hasMore = true;
  const pageSize = 1000;

  while (hasMore) {
    const coins = await getGnarsPairedCoins(pageSize, total);
    total += coins.length;
    hasMore = coins.length === pageSize;
  }

  return total;
}
