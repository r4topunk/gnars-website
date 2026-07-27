import { cache } from "react";
import { formatEther } from "viem";
import { BASE_URL, TREASURY_TOKEN_ADDRESSES, TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";
import { fetchTotalAuctionSalesWei } from "@/services/dao";
import { getEthUsd, getTokenPricesUsd, type UsdPrice } from "@/services/prices";

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

export interface TreasurySnapshot {
  /** `null` when a required price was unavailable — NOT the same as $0. */
  usdTotal: number | null;
  ethBalance: number;
  totalAuctionSales: number;
}

function getBaseUrl() {
  return BASE_URL;
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

/**
 * Loads a full treasury snapshot including ETH balance, token balances, and auction sales.
 * Deduplicated within a single React render pass via `react.cache()`.
 */
export const loadTreasurySnapshot = cache(
  async (treasuryAddress: string): Promise<TreasurySnapshot> => {
    const baseUrl = getBaseUrl();

    const [ethRes, tokenRes, tokenPrices, ethUsd, auctionSalesWei] = await Promise.all([
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
      // Straight to the service — this is already server-side, so the old
      // `fetch(${baseUrl}/api/prices)` was the server making an HTTP round trip
      // to its own API (two of them) purely to read a cached value.
      getTokenPricesUsd(
        TREASURY_TOKEN_ADDRESSES.map((a) => String(a).toLowerCase()),
        "base",
      ),
      getEthUsd(),
      fetchTotalAuctionSalesWei().catch(() => BigInt(0)),
    ]);

    const ethBalanceWei = BigInt(ethRes.result ?? "0x0");
    const ethBalance = Number(formatEther(ethBalanceWei));

    const tokenBalances = (tokenRes.result?.tokenBalances ?? []).filter((token) => {
      const balance = token.tokenBalance?.toLowerCase();
      return balance && balance !== "0" && balance !== "0x0";
    });

    // WETH is 1:1 with ETH and takes the fresher Alchemy feed, as before.
    const wethAddress = String(TREASURY_TOKEN_ALLOWLIST.WETH).toLowerCase();
    const priceLookup: Record<string, UsdPrice> = { ...tokenPrices, [wethAddress]: ethUsd };

    const DECIMALS: Record<string, number> = {
      [String(TREASURY_TOKEN_ALLOWLIST.USDC).toLowerCase()]: 6,
      [String(TREASURY_TOKEN_ALLOWLIST.WETH).toLowerCase()]: 18,
      [String(TREASURY_TOKEN_ALLOWLIST.SENDIT).toLowerCase()]: 18,
    };

    // A price we could not fetch used to arrive as 0 and multiply straight into
    // the total, so an Alchemy or CoinGecko hiccup rendered a confident, wrong
    // dollar figure — usually far too low, since ETH dominates this treasury.
    // Track it instead and report "unknown" rather than a number we don't have.
    let priced = true;

    const tokensUsd = tokenBalances.reduce((sum, token) => {
      const address = token.contractAddress ? String(token.contractAddress).toLowerCase() : null;
      if (!address) return sum;
      const decimals = DECIMALS[address] ?? 18;
      const raw = token.tokenBalance ?? "0x0";
      const parsed = Number.parseInt(raw, 16);
      const balance = Number.isFinite(parsed) ? parsed / Math.pow(10, decimals) : 0;
      if (balance === 0) return sum;
      const price = priceLookup[address];
      if (price == null) {
        priced = false;
        return sum;
      }
      return sum + balance * price;
    }, 0);

    if (ethBalance > 0 && ethUsd == null) priced = false;

    const nativeEthUsd = ethBalance * (ethUsd ?? 0);
    // `null` = "we could not price this", which every consumer must render as
    // unavailable. It is never the same thing as a treasury worth $0.
    const usdTotal: number | null = priced ? tokensUsd + nativeEthUsd : null;
    const totalAuctionSales = Number(formatEther(auctionSalesWei));

    return {
      usdTotal,
      ethBalance,
      totalAuctionSales,
    };
  },
);
