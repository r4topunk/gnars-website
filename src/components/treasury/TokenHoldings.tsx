import { cache } from "react";
import { headers } from "next/headers";
import { TREASURY_TOKEN_ADDRESSES } from "@/lib/config";
import { getBrlRateForRequest } from "@/services/exchange-rate";
import { getTokenPricesUsd } from "@/services/prices";
import { EnrichedToken, TokenHoldingsClient } from "./TokenHoldingsClient";

interface TokenBalance {
  contractAddress?: string;
  tokenBalance?: string;
}

interface TokenBalancesResponse {
  result?: {
    tokenBalances?: TokenBalance[];
  };
}

interface TokenMetadataResponse {
  result?: {
    decimals?: number;
    logo?: string;
    name?: string;
    symbol?: string;
  };
}

export const loadTokenHoldings = cache(
  async (treasuryAddress: string): Promise<EnrichedToken[]> => {
    const baseUrl = await getBaseUrl();

    const balancesResponse = await fetchJson<TokenBalancesResponse>(`${baseUrl}/api/alchemy`, {
      method: "POST",
      body: JSON.stringify({
        method: "alchemy_getTokenBalances",
        params: [treasuryAddress, TREASURY_TOKEN_ADDRESSES.filter(Boolean)],
      }),
    });

    const balances = (balancesResponse.result?.tokenBalances ?? []).filter((token) => {
      const balance = token.tokenBalance?.toLowerCase();
      return balance && balance !== "0" && balance !== "0x0";
    });

    if (!balances.length) {
      return [];
    }

    const metadataResults = await Promise.all(
      balances.map(async (token) => {
        if (!token.contractAddress) return null;
        try {
          return await fetchJson<TokenMetadataResponse>(`${baseUrl}/api/alchemy`, {
            method: "POST",
            body: JSON.stringify({
              method: "alchemy_getTokenMetadata",
              params: [token.contractAddress],
            }),
          });
        } catch {
          return null;
        }
      }),
    );

    const tokensWithMetadata: EnrichedToken[] = [];
    for (let index = 0; index < balances.length; index += 1) {
      const token = balances[index];
      const metadata = metadataResults[index]?.result;
      if (
        !token.contractAddress ||
        !metadata?.symbol ||
        !metadata.name ||
        metadata.decimals === undefined
      ) {
        continue;
      }

      const decimals = Number(metadata.decimals);
      const raw = token.tokenBalance ?? "0x0";
      const parsed = Number.parseInt(raw, 16);
      const balance = Number.isFinite(parsed) ? parsed / Math.pow(10, decimals) : 0;

      tokensWithMetadata.push({
        contractAddress: token.contractAddress,
        balance,
        decimals,
        symbol: metadata.symbol,
        name: metadata.name,
        logo: metadata.logo,
        usdValue: null,
      });
    }

    if (!tokensWithMetadata.length) {
      return [];
    }

    // Server-side already — read the service directly instead of this module
    // making an HTTP round trip to the app's own /api/prices.
    const priceMap = await getTokenPricesUsd(
      tokensWithMetadata.map((token) => token.contractAddress.toLowerCase()),
      "base",
    );

    for (const token of tokensWithMetadata) {
      const price = priceMap[token.contractAddress.toLowerCase()];
      // `null` = unpriceable. Leave usdValue null rather than claiming $0, which
      // is a real balance the UI would otherwise show as worthless.
      token.usdValue = price == null ? null : price * token.balance;
    }

    // Sort tokens by USD value descending for a friendlier presentation.
    // Unpriced tokens sort last rather than being treated as worth $0.
    tokensWithMetadata.sort((a, b) => (b.usdValue ?? -1) - (a.usdValue ?? -1));

    return tokensWithMetadata;
  },
);

async function getBaseUrl() {
  const h = await headers();
  const protocol = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    throw new Error("Unable to determine request host");
  }
  return `${protocol}://${host}`;
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

interface TokenHoldingsProps {
  treasuryAddress: string;
}

export async function TokenHoldings({ treasuryAddress }: TokenHoldingsProps) {
  let tokens: Awaited<ReturnType<typeof loadTokenHoldings>> = [];
  let error: string | undefined;
  try {
    tokens = await loadTokenHoldings(treasuryAddress);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load token holdings";
  }
  const brlRate = await getBrlRateForRequest();
  return <TokenHoldingsClient tokens={tokens} error={error} brlRate={brlRate} />;
}
