import { cache } from "react";
import { DAO_ADDRESSES, TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";

/**
 * Recent value arriving at the treasury.
 *
 * Three transfer categories are needed, not the two you would reach for:
 *
 * - `erc20`     — USDC and WETH.
 * - `external`  — someone sending ETH straight from a wallet. Rare; the last
 *                 one landed in February 2025.
 * - `internal`  — **where auction proceeds actually arrive.** Settlement is a
 *                 contract-to-contract move from the auction house, which is
 *                 invisible to `external`. Querying only `external` + `erc20`
 *                 reports no ETH income for over a year and misses the DAO's
 *                 primary revenue entirely.
 */

const USDC = TREASURY_TOKEN_ALLOWLIST.USDC.toLowerCase();
const WETH = TREASURY_TOKEN_ALLOWLIST.WETH.toLowerCase();

/** Assets this panel reports. Everything else the treasury receives is noise here. */
const TRACKED = new Set([USDC, WETH]);

export type InflowAsset = "ETH" | "WETH" | "USDC";

export interface TreasuryInflow {
  /** Transaction hash — unique per row for keying and for the explorer link. */
  hash: string;
  asset: InflowAsset;
  /** Human units, already scaled by the asset's decimals. */
  amount: number;
  from: string;
  /** ISO timestamp of the containing block. */
  at: string;
  /** True when the value arrived contract-to-contract (auction settlement). */
  internal: boolean;
}

interface AlchemyTransfer {
  hash?: string;
  from?: string;
  value?: number | null;
  asset?: string | null;
  category?: string;
  rawContract?: { address?: string | null };
  metadata?: { blockTimestamp?: string };
}

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;

/**
 * Newest inflows first.
 *
 * Returns `[]` rather than throwing on any failure: this renders inside the
 * treasury page, and a Goldsky/Alchemy hiccup should cost one panel, not the
 * whole route.
 */
export const loadTreasuryInflows = cache(async (limit = 8): Promise<TreasuryInflow[]> => {
  if (!ALCHEMY_KEY) return [];

  try {
    const res = await fetch(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            toAddress: DAO_ADDRESSES.treasury,
            category: ["external", "internal", "erc20"],
            withMetadata: true,
            excludeZeroValue: true,
            // Over-fetch: the window is filtered down to three assets, and a
            // burst of one token would otherwise crowd out everything else.
            maxCount: "0x32",
            order: "desc",
          },
        ],
      }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];

    const json = (await res.json()) as { result?: { transfers?: AlchemyTransfer[] } };

    return (json.result?.transfers ?? [])
      .flatMap<TreasuryInflow>((t) => {
        const amount = typeof t.value === "number" ? t.value : 0;
        if (!t.hash || !t.from || amount <= 0) return [];

        const contract = t.rawContract?.address?.toLowerCase();
        const isNative = t.category === "external" || t.category === "internal";
        if (!isNative && (!contract || !TRACKED.has(contract))) return [];

        const asset: InflowAsset = isNative ? "ETH" : contract === USDC ? "USDC" : "WETH";

        return [
          {
            hash: t.hash,
            asset,
            amount,
            from: t.from,
            at: t.metadata?.blockTimestamp ?? "",
            internal: t.category === "internal",
          },
        ];
      })
      .slice(0, limit);
  } catch {
    return [];
  }
});
