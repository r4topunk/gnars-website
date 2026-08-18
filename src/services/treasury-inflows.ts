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

/**
 * 0xSplits V2 SplitsWarehouse on Base — a shared singleton.
 *
 * Splits do not pay recipients directly: `distribute()` credits the warehouse,
 * and each recipient withdraws from it. So treasury income that originated in a
 * split arrives `from` THIS address, never from the split itself. Verified: the
 * Gnars Subnet Final Split has distributed $291.02, the treasury is a 20%
 * recipient, and exactly $58.29 of USDC reached the treasury from here — the
 * nine cents of drift being yield between distribution and withdrawal.
 */
const SPLITS_WAREHOUSE = "0x8fb66f38cf86a3d5e8768f8f1754a24a6c661fb8";

/** The split that pays the treasury its 20% of Morpheus subnet earnings. */
export const SUBNET_FINAL_SPLIT = "0xcc7e971fb6828e45c01e168849447e460fdf3a4e";

/**
 * Where a credit came from. Kept deliberately coarse — these are the four
 * things the DAO actually earns from, not a transaction taxonomy.
 */
export type InflowSource = "auction" | "subnet" | "splits" | "transfer";

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
  /** Where it came from, for the source tiles and the tag on each row. */
  source: InflowSource;
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
export const loadTreasuryInflows = cache(
  async (limit = 8, splitsAmbiguous = false): Promise<TreasuryInflow[]> => {
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
          const from = t.from.toLowerCase();

          // Auction settlement is a contract-to-contract ETH move from the auction
          // house — the DAO's primary revenue, and invisible to `external`.
          //
          // Anything arriving from the warehouse was distributed by a split the
          // treasury is a recipient of. Today the only one paying the treasury is
          // the subnet split, so warehouse USDC IS subnet income. That stops being
          // true the day a rider sponsorship split is first distributed: its
          // payout leaves the SAME warehouse address, and tagging it `subnet`
          // would report sponsorship yield as Morpheus earnings.
          //
          // `splitsAmbiguous` is resolved by the caller, which knows whether any
          // rider split has distributed yet. Until one has, warehouse credits are
          // unambiguously subnet; after that they degrade to the honest `splits`
          // rather than silently claiming the wrong origin.
          //
          // READ THIS BEFORE TOUCHING THE `subnet` BRANCH. The label users see is
          // no longer the vague "Subnet" — it now reads "Morpheus Subnet", which
          // names a specific product. So the failure mode changed with it: the
          // first rider sponsorship payout would not just be filed under a fuzzy
          // heading, it would appear on a public treasury page as Morpheus
          // earnings when it is nothing of the sort. Disambiguating stopped being
          // cosmetic the day that string was renamed. `splitsAmbiguous` and the
          // `splits` tag exist precisely so that day costs one flag, not a
          // redesign — set it and these rows degrade to an honest label instead
          // of asserting a false origin.
          const source: InflowSource =
            from === DAO_ADDRESSES.auction.toLowerCase()
              ? "auction"
              : from === SPLITS_WAREHOUSE
                ? splitsAmbiguous
                  ? "splits"
                  : "subnet"
                : "transfer";

          return [
            {
              hash: t.hash,
              asset,
              amount,
              from: t.from,
              at: t.metadata?.blockTimestamp ?? "",
              internal: t.category === "internal",
              source,
            },
          ];
        })
        .slice(0, limit);
    } catch {
      return [];
    }
  },
);
