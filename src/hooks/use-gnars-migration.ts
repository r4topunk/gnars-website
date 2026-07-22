"use client";

/**
 * Gnars Migration — data layer.
 *
 * Consolidates a wallet's scattered Zora coins into $gnars. Because $gnars is
 * itself a Zora Creator Coin, the whole path stays inside the Zora Coins SDK
 * with ZORA as the hub:
 *
 *   each coin ──tradeCoin──▶ ZORA   (V4 hooks auto-route content → creator → ZORA)
 *   Σ ZORA    ──tradeCoin──▶ $gnars (supported creator-coin ⇄ ZORA trade)
 *
 * A small % of the output $gnars is burned on every migration (see
 * MIGRATION_BURN_BPS) — buy-and-burn to tighten $gnars supply.
 *
 * This hook only READS and QUOTES. Execution lives in use-execute-migration.ts.
 */
import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  createTradeCall,
  getProfileBalances,
  setApiKey,
  type TradeParameters,
} from "@zoralabs/coins-sdk";
import { formatUnits, type Address } from "viem";
import { GNARS_CREATOR_COIN, MIGRATION_BURN_BPS, ZORA_TOKEN_BASE } from "@/lib/config";

const BASE_CHAIN_ID = 8453;
const GNARS = GNARS_CREATOR_COIN.toLowerCase();
const ZORA = ZORA_TOKEN_BASE.toLowerCase();

let apiKeyReady = false;
if (typeof window !== "undefined") {
  const key = process.env.NEXT_PUBLIC_ZORA_API_KEY;
  if (key) {
    setApiKey(key);
    apiKeyReady = true;
  } else {
    console.error("[use-gnars-migration] Missing NEXT_PUBLIC_ZORA_API_KEY — quoting disabled");
  }
}

// Zora coins use 18 decimals across the protocol.
const ZORA_COIN_DECIMALS = 18;

/** A single coin the user could migrate, plus its live quote once fetched. */
export interface MigratableCoin {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  /** Raw balance (BigInt-safe string). */
  balance: string;
  displayBalance: string;
  logoUrl: string | null;
  usdValue: number | null;
  /** Coin market cap (USD, string) from Zora's indexer — used for the safety floor. */
  marketCap: number | null;
  /**
   * The token this coin is directly paired with in its Zora pool — the first
   * routing hop. A content coin is paired with its creator coin; a creator
   * coin is paired with ZORA. Used to render the step-by-step path.
   */
  pairedWith: { address: string; name: string } | null;
}

/** Where a coin sits in the Zora liquidity graph, for path display. */
export type CoinKind = "gnars-content" | "creator" | "content" | "other";

export interface RouteHop {
  /** Short label shown in the chip (symbol or well-known token name). */
  label: string;
  /** True for the ZORA hub / $gnars destination, so the UI can style them. */
  kind: "coin" | "creator" | "zora" | "gnars";
}

/**
 * Builds the human-readable routing path for a coin, e.g.
 *   content coin → creator coin → ZORA → $gnars   (3 hops)
 *   creator coin → ZORA → $gnars                  (2 hops)
 *   Gnars content coin → $gnars                   (direct)
 * The Zora SDK collapses these into one trade under the hood; this is purely
 * to show the user what is happening.
 */
export function buildRoute(coin: MigratableCoin): { kind: CoinKind; hops: RouteHop[] } {
  const paired = coin.pairedWith?.address?.toLowerCase();
  const start: RouteHop = { label: coin.symbol, kind: "coin" };
  const gnarsHop: RouteHop = { label: "$GNARS", kind: "gnars" };
  const zoraHop: RouteHop = { label: "ZORA", kind: "zora" };

  if (paired === GNARS) {
    // Paired directly with the Gnars creator coin — one hop.
    return { kind: "gnars-content", hops: [start, gnarsHop] };
  }
  if (paired === ZORA) {
    // A creator coin, paired with ZORA.
    return { kind: "creator", hops: [start, zoraHop, gnarsHop] };
  }
  if (coin.pairedWith) {
    // A content coin paired with some other creator coin.
    return {
      kind: "content",
      hops: [start, { label: coin.pairedWith.name, kind: "creator" }, zoraHop, gnarsHop],
    };
  }
  // Unknown pairing — still routes to ZORA via the SDK.
  return { kind: "other", hops: [start, zoraHop, gnarsHop] };
}

/**
 * The connected wallet's Zora-coin holdings, sourced from Zora's own indexer
 * (`getProfileBalances`) — NOT a raw ERC-20 scan. This is deliberate for safety:
 *
 * - Only genuine Zora coins are returned, so random ERC-20s (WETH, HIGHER, …)
 *   and, critically, scam/airdrop tokens never enter the migration flow.
 * - `excludeHidden` drops coins Zora has already flagged as spam/hidden.
 * - We never approve or trade an arbitrary contract the user didn't intend —
 *   every candidate is a coin with a real Zora pool, traded via Zora's router.
 *
 * Drops $gnars itself and the ZORA hub token (nothing to migrate there).
 */
export function useMigratableCoins(address: string | undefined) {
  const query = useQuery<MigratableCoin[]>({
    queryKey: ["migratable-coins", address?.toLowerCase()],
    enabled: apiKeyReady && Boolean(address),
    staleTime: 60_000,
    queryFn: async () => {
      const resp = await getProfileBalances({
        identifier: (address as string).toLowerCase(),
        count: 200,
        chainIds: [BASE_CHAIN_ID],
        excludeHidden: true,
        sortOption: "USD_VALUE",
      });

      const edges = resp.data?.profile?.coinBalances?.edges ?? [];
      const seen = new Set<string>();
      const coins: MigratableCoin[] = [];

      for (const edge of edges) {
        const node = edge?.node;
        const coin = node?.coin;
        if (!coin?.address || !node?.balance) continue;

        const addr = coin.address.toLowerCase();
        // Skip the destination + hub, non-Base coins, dupes, and zero balances.
        if (addr === GNARS || addr === ZORA || seen.has(addr)) continue;
        if (coin.chainId !== BASE_CHAIN_ID) continue;
        let balance: bigint;
        try {
          balance = BigInt(node.balance);
        } catch {
          continue;
        }
        if (balance <= 0n) continue;
        seen.add(addr);

        const displayBalance = formatUnits(balance, ZORA_COIN_DECIMALS);
        const priceUsd = coin.tokenPrice?.priceInUsdc ? Number(coin.tokenPrice.priceInUsdc) : null;
        const usdValue = priceUsd !== null ? Number(displayBalance) * priceUsd : null;
        const marketCap = coin.marketCap ? Number(coin.marketCap) : null;
        const pairedWith = coin.poolCurrencyToken?.address
          ? {
              address: coin.poolCurrencyToken.address,
              name: coin.poolCurrencyToken.name ?? "ZORA",
            }
          : null;

        coins.push({
          address: coin.address as Address,
          symbol: coin.symbol ?? "?",
          name: coin.name ?? coin.symbol ?? "Unknown coin",
          decimals: ZORA_COIN_DECIMALS,
          balance: balance.toString(),
          displayBalance,
          logoUrl: null,
          usdValue,
          marketCap,
          pairedWith,
        });
      }

      return coins;
    },
  });

  return {
    coins: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export interface CoinQuote {
  address: Address;
  /** True when the SDK found a route coin → ZORA. */
  routable: boolean;
  /** Estimated ZORA out (raw, 18 decimals) for the full balance. */
  zoraOut: bigint;
  error?: string;
}

/**
 * Quotes each selected coin's full balance → ZORA via the Zora SDK, running the
 * requests concurrently (React Query dedupes + caches per coin+amount). Only the
 * coins the user actually selected are quoted, keeping API load bounded.
 */
export function useCoinQuotes(
  coins: MigratableCoin[],
  sender: string | undefined,
  slippage = 0.15,
) {
  const results = useQueries({
    queries: coins.map((coin) => ({
      queryKey: ["migration-quote", coin.address.toLowerCase(), coin.balance, sender],
      enabled: apiKeyReady && Boolean(sender) && BigInt(coin.balance) > 0n,
      staleTime: 30_000,
      retry: false,
      queryFn: async (): Promise<CoinQuote> => {
        const params: TradeParameters = {
          sell: { type: "erc20", address: coin.address },
          buy: { type: "erc20", address: ZORA_TOKEN_BASE },
          amountIn: BigInt(coin.balance),
          slippage,
          sender: sender as Address,
        };
        try {
          const resp = await createTradeCall(params);
          if (!resp?.success || !resp.quote?.amountOut) {
            return { address: coin.address, routable: false, zoraOut: 0n };
          }
          return {
            address: coin.address,
            routable: true,
            zoraOut: BigInt(resp.quote.amountOut),
          };
        } catch (err) {
          return {
            address: coin.address,
            routable: false,
            zoraOut: 0n,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    })),
  });

  const quotes = useMemo(
    () => results.map((r) => r.data).filter((q): q is CoinQuote => Boolean(q)),
    [results],
  );
  const isLoading = results.some((r) => r.isLoading);
  const totalZoraOut = useMemo(
    () => quotes.reduce((sum, q) => sum + (q.routable ? q.zoraOut : 0n), 0n),
    [quotes],
  );

  return { quotes, totalZoraOut, isLoading };
}

/**
 * Given aggregate ZORA, quotes the final ZORA → $gnars leg and splits the
 * output into the burn skim and the amount the user keeps.
 */
export function useGnarsOutputQuote(totalZoraOut: bigint, sender: string | undefined) {
  const query = useQuery({
    queryKey: ["migration-gnars-out", totalZoraOut.toString(), sender],
    enabled: apiKeyReady && Boolean(sender) && totalZoraOut > 0n,
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const params: TradeParameters = {
        sell: { type: "erc20", address: ZORA_TOKEN_BASE },
        buy: { type: "erc20", address: GNARS_CREATOR_COIN as Address },
        amountIn: totalZoraOut,
        slippage: 0.15,
        sender: sender as Address,
      };
      const resp = await createTradeCall(params);
      if (!resp?.success || !resp.quote?.amountOut) {
        throw new Error("No route ZORA → $gnars");
      }
      return BigInt(resp.quote.amountOut);
    },
  });

  const totalGnars = query.data ?? 0n;
  const burnGnars = (totalGnars * BigInt(MIGRATION_BURN_BPS)) / 10_000n;
  const netGnars = totalGnars - burnGnars;

  return {
    totalGnars,
    burnGnars,
    netGnars,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/** Format a raw 18-decimal amount for display (trims to a sane precision). */
export function formatCoinAmount(raw: bigint, decimals = 18, maxFrac = 4): string {
  const s = formatUnits(raw, decimals);
  const n = Number(s);
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}
