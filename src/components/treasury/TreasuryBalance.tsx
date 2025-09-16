import { cache } from "react";
import { formatEther } from "viem";
import { headers } from "next/headers";
import { TREASURY_TOKEN_ADDRESSES, TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";
import { fetchTotalAuctionSalesWei } from "@/services/dao";
import { TreasuryBalanceClient } from "./TreasuryBalanceClient";

interface TokenBalance {
  contractAddress?: string;
  tokenBalance: string;
  decimals?: number;
}

interface AlchemyTokenResponse {
  result?: {
    tokenBalances?: TokenBalance[];
  };
}

interface PriceResponse {
  prices?: Record<string, { usd?: number }>;
}

interface TreasurySnapshot {
  usdTotal: number;
  ethBalance: number;
  totalAuctionSales: number;
}

const loadTreasurySnapshot = cache(async (treasuryAddress: string): Promise<TreasurySnapshot> => {
  const baseUrl = await getBaseUrl();

  const [ethRes, tokenRes, priceRes, auctionSalesWei] = await Promise.all([
    fetchJson<{ result?: string }>(`${baseUrl}/api/alchemy`, {
      method: "POST",
      body: JSON.stringify({
        method: "eth_getBalance",
        params: [treasuryAddress, "latest"],
      }),
    }),
    fetchJson<AlchemyTokenResponse>(`${baseUrl}/api/alchemy`, {
      method: "POST",
      body: JSON.stringify({
        method: "alchemy_getTokenBalances",
        params: [treasuryAddress, TREASURY_TOKEN_ADDRESSES.filter(Boolean)],
      }),
    }),
    fetchJson<PriceResponse>(`${baseUrl}/api/prices`, {
      method: "POST",
      body: JSON.stringify({
        addresses: TREASURY_TOKEN_ADDRESSES.map((a) => String(a).toLowerCase()),
      }),
    }).catch(() => ({ prices: {} })),
    fetchTotalAuctionSalesWei().catch(() => BigInt(0)),
  ]);

  const ethBalanceWei = BigInt(ethRes.result ?? "0x0");
  const ethBalance = Number(formatEther(ethBalanceWei));

  const tokenBalances = (tokenRes.result?.tokenBalances ?? []).filter((token) => {
    const balance = token.tokenBalance?.toLowerCase();
    return balance && balance !== "0" && balance !== "0x0";
  });

  const prices = priceRes.prices ?? {};
  const priceLookup = Object.fromEntries(
    Object.entries(prices).map(([address, value]) => [address.toLowerCase(), Number(value?.usd ?? 0) || 0]),
  );

  const tokensUsd = tokenBalances.reduce((sum, token) => {
    const address = token.contractAddress ? String(token.contractAddress).toLowerCase() : null;
    if (!address) return sum;
    const decimals = Number(token.decimals ?? 18);
    const raw = token.tokenBalance ?? "0x0";
    const parsed = Number.parseInt(raw, 16);
    const balance = Number.isFinite(parsed) ? parsed / Math.pow(10, decimals) : 0;
    const price = priceLookup[address] ?? 0;
    return sum + balance * price;
  }, 0);

  const wethAddress = String(TREASURY_TOKEN_ALLOWLIST.WETH).toLowerCase();
  const ethPrice = priceLookup[wethAddress] ?? 0;
  const usdTotal = tokensUsd + ethBalance * ethPrice;
  const totalAuctionSales = Number(formatEther(auctionSalesWei));

  return {
    usdTotal,
    ethBalance,
    totalAuctionSales,
  };
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

interface TreasuryBalanceProps {
  treasuryAddress: string;
  metric?: "total" | "eth" | "auctions";
}

export async function TreasuryBalance({ treasuryAddress, metric = "total" }: TreasuryBalanceProps) {
  try {
    const snapshot = await loadTreasurySnapshot(treasuryAddress);
    const value =
      metric === "total"
        ? snapshot.usdTotal
        : metric === "eth"
          ? snapshot.ethBalance
          : snapshot.totalAuctionSales;

    return <TreasuryBalanceClient metric={metric} value={value} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load treasury data";
    return <TreasuryBalanceClient metric={metric} error={message} />;
  }
}
