import { cache } from "react";
import { headers } from "next/headers";
import { TREASURY_TOKEN_ADDRESSES } from "@/lib/config";
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

interface PriceResponse {
  prices?: Record<string, { usd?: number }>;
}

const loadTokenHoldings = cache(async (treasuryAddress: string): Promise<EnrichedToken[]> => {
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
      usdValue: 0,
    });
  }

  if (!tokensWithMetadata.length) {
    return [];
  }

  try {
    const priceResponse = await fetchJson<PriceResponse>(`${baseUrl}/api/prices`, {
      method: "POST",
      body: JSON.stringify({
        addresses: tokensWithMetadata.map((token) => token.contractAddress.toLowerCase()),
      }),
    });

    const priceMap = Object.fromEntries(
      Object.entries(priceResponse.prices ?? {}).map(([address, value]) => [
        address.toLowerCase(),
        Number(value?.usd ?? 0) || 0,
      ]),
    );

    for (const token of tokensWithMetadata) {
      const price = priceMap[token.contractAddress.toLowerCase()] ?? 0;
      token.usdValue = price * token.balance;
    }
  } catch {
    // Ignore price errors; usdValue will remain 0.
  }

  // Sort tokens by USD value descending for a friendlier presentation.
  tokensWithMetadata.sort((a, b) => b.usdValue - a.usdValue);

  return tokensWithMetadata;
});

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
  try {
    const tokens = await loadTokenHoldings(treasuryAddress);
    return <TokenHoldingsClient tokens={tokens} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load token holdings";
    return <TokenHoldingsClient tokens={[]} error={message} />;
  }
}
