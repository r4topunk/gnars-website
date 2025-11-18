/**
 * Zora API Client
 *
 * Direct API calls to Zora's endpoints for features not exposed in the SDK.
 */

import { Hex } from "viem";

const ZORA_API_BASE = "https://api.zora.co";

export interface PoolConfigParams {
  currency: "CREATOR_COIN" | "ZORA" | "ETH" | "CREATOR_COIN_OR_ZORA";
  creator_identifier: string;
  starting_market_cap: "LOW" | "HIGH";
  chain_id: string;
}

export interface PoolConfigResponse {
  poolConfig: string;
}

/**
 * Fetches optimal pool configuration from Zora's API
 *
 * @param params Pool configuration parameters
 * @returns Hex-encoded pool configuration bytes
 * @throws Error if API call fails
 */
export async function getPoolConfig(
  params: PoolConfigParams
): Promise<Hex> {
  const queryParams = new URLSearchParams({
    currency: params.currency,
    creator_identifier: params.creator_identifier,
    starting_market_cap: params.starting_market_cap,
    chain_id: params.chain_id,
  });

  const url = `${ZORA_API_BASE}/create/content/pool-config?${queryParams}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Zora API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  const data = (await response.json()) as PoolConfigResponse;

  if (!data.poolConfig) {
    throw new Error("No poolConfig in API response");
  }

  return data.poolConfig as Hex;
}
