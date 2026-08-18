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

/** The /swap affiliate-fee split (SWAP_FEE_RECIPIENT_BASE in config) — Gnars
 * treasury 50 / operations wallet 50, read from its SplitUpdated event. */
export const SWAP_FEE_SPLIT = "0x15e69fd67dcc17e061ceeb93dac791e0f5af0eae";

/**
 * THE SPLIT → PRODUCT MAP. Attribution is per ORIGINATING SPLIT, not per
 * warehouse: every split pays through the same SplitsWarehouse address, so
 * "warehouse USDC = subnet" was a rule with an expiry date — and it expired.
 * The swap-fee split distributed on 2026-06-22, and that credit spent weeks on
 * the treasury page labelled "Morpheus Subnet".
 *
 * A warehouse credit is attributed by which of these splits emitted an event
 * in the SAME transaction (distribute-and-withdraw flows). A credit whose
 * transaction names none of them — a bare `withdraw()` of balance deposited
 * earlier, or a split nobody has mapped yet (two such ETH-paying splits,
 * 0xd9b2…ad6b and 0xdac8…e54, have already credited this treasury) — falls to
 * the generic `splits` tag. Generic is the honest floor: an unmapped split
 * must surface as unclassified, never wear another product's name.
 *
 * Adding a product = one entry here plus its i18n strings and tile tone.
 */
const SPLIT_PRODUCT: Record<string, InflowSource> = {
  [SUBNET_FINAL_SPLIT]: "subnet",
  [SWAP_FEE_SPLIT]: "swap",
};

/**
 * Where a credit came from. Kept deliberately coarse — these are the things
 * the DAO actually earns from, not a transaction taxonomy. `splits` is the
 * explicit "a split paid this but we cannot say which product" bucket.
 */
export type InflowSource = "auction" | "subnet" | "swap" | "splits" | "secondary" | "transfer";

/**
 * Seaport 1.6 (the canonical vanity deployment). Secondary sales of Gnars NFTs
 * settle through it in two shapes, and only ONE of them is detectable by the
 * sender:
 *
 * - ETH listings: Seaport itself pays the treasury, so `from` IS this address.
 * - Accepted WETH offers: the WETH leaves EACH BUYER's wallet (via conduit),
 *   so `from` varies per row — dozens of senders were dozens of buyers, not a
 *   mystery. Do NOT "fix" that path by filtering on a sender; the only
 *   reliable marker is Seaport appearing among the transaction's log emitters
 *   (verified: to = Seaport, emitters = Seaport + WETH + the Gnars token).
 *
 * The tag is "secondary", never a platform name: Seaport is an open protocol
 * (OpenSea, aggregators, bots), and the dissected fulfilment used no OpenSea
 * conduit — the platform is not provable from the chain.
 */
const SEAPORT = "0x0000000000000068f116a894984e2db1123eb395";

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
 * Which mapped split a warehouse-credit transaction came from.
 *
 * A distribute-and-withdraw flow puts the split's own events in the credit's
 * transaction, so the receipt names the product. A bare `withdraw()` of
 * balance deposited earlier does not — the warehouse ledger is fungible per
 * (owner, token), so per-transaction attribution is genuinely impossible
 * there, and the answer is the generic `splits`, not a guess. A failed
 * receipt read degrades the same way: `splits` asserts nothing false.
 */
async function txLogEmitters(hash: string): Promise<Set<string> | null> {
  try {
    const res = await fetch(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [hash],
      }),
      // Receipts are immutable; cache them as long as Next allows.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: { logs?: { address?: string }[] } };
    return new Set((json.result?.logs ?? []).map((l) => (l.address ?? "").toLowerCase()));
  } catch {
    return null;
  }
}

async function splitSourceForTx(hash: string): Promise<InflowSource> {
  const emitters = await txLogEmitters(hash);
  if (!emitters) return "splits";
  for (const e of emitters) {
    const product = SPLIT_PRODUCT[e];
    if (product) return product;
  }
  return "splits";
}

/** A WETH credit is a secondary sale iff Seaport emitted in its transaction —
 * see the SEAPORT note for why the sender can never be the marker here. A
 * failed receipt read stays "transfer": asserting a sale needs the evidence. */
async function secondaryOrTransfer(hash: string): Promise<InflowSource> {
  const emitters = await txLogEmitters(hash);
  return emitters?.has(SEAPORT) ? "secondary" : "transfer";
}

/** One page of inflows plus the cursor to the next. `nextPageKey: null` means
 * the history is genuinely exhausted — a different fact from "not fetched yet",
 * and the UI keeps the two apart. */
export interface InflowPage {
  inflows: TreasuryInflow[];
  nextPageKey: string | null;
}

/**
 * Newest inflows first, one indexer page at a time.
 *
 * Alchemy pages with an opaque `pageKey`; passing none starts from the newest
 * transfer. Each raw page is 50 transfers, filtered down to the assets this
 * panel tracks — so a page can legitimately yield fewer visible rows than the
 * client shows per screen. The caller decides whether to chain another fetch.
 *
 * THROWS on failure rather than returning an empty page: an empty page with a
 * null cursor is indistinguishable from "history complete", and caching that
 * lie is the same bug class as the empty backer list on /stake. The route
 * translates the throw into a 500 with no-store.
 */
export const loadTreasuryInflowsPage = cache(async (pageKey?: string): Promise<InflowPage> => {
  if (!ALCHEMY_KEY) return { inflows: [], nextPageKey: null };

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
          maxCount: "0x32",
          order: "desc",
          ...(pageKey ? { pageKey } : {}),
        },
      ],
    }),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`inflows: transfers fetch failed (${res.status})`);

  const json = (await res.json()) as {
    error?: unknown;
    result?: { transfers?: AlchemyTransfer[]; pageKey?: string };
  };
  if (json.error || !json.result) throw new Error("inflows: transfers response malformed");

  const rows = await Promise.all(
    (json.result.transfers ?? []).map(async (t): Promise<TreasuryInflow[]> => {
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
      // Warehouse credits are attributed to a PRODUCT by the split that
      // emitted in the credit's own transaction (see SPLIT_PRODUCT for why
      // the sender address alone cannot: every split shares this one
      // warehouse, and the day two products' payouts left it under one
      // label has already happened — a swap-fee credit ran on the public
      // page as "Morpheus Subnet"). One immutable-receipt read per
      // warehouse row; everything else costs nothing extra.
      const source: InflowSource =
        from === DAO_ADDRESSES.auction.toLowerCase()
          ? "auction"
          : from === SPLITS_WAREHOUSE
            ? await splitSourceForTx(t.hash)
            : from === SEAPORT
              ? "secondary"
              : asset === "WETH"
                ? await secondaryOrTransfer(t.hash)
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
    }),
  );
  return { inflows: rows.flat(), nextPageKey: json.result.pageKey ?? null };
});

/**
 * First page only, swallowing failure into an empty list: this seeds the
 * server-rendered panel, where an indexer hiccup should cost one card, not the
 * route. The paged API route uses `loadTreasuryInflowsPage` directly and does
 * NOT swallow — see the throw note there.
 */
export const loadTreasuryInflows = cache(async (): Promise<InflowPage> => {
  try {
    return await loadTreasuryInflowsPage();
  } catch {
    return { inflows: [], nextPageKey: null };
  }
});

export interface SubnetEarnings {
  totalUsdc: number;
  claimCount: number;
}

/**
 * All-time Morpheus subnet earnings: every USDC transfer from the final split
 * to the treasury. The paged inflows feed above is a window and cannot sum
 * honestly; this asks Alchemy for exactly the split→treasury lane and walks
 * every page (the claim history is tiny). `null` = could not determine —
 * the KPI card renders a dash, never a fabricated 0.
 */
export const loadSubnetEarnings = cache(async (): Promise<SubnetEarnings | null> => {
  if (!ALCHEMY_KEY) return null;
  try {
    let totalUsdc = 0;
    let claimCount = 0;
    let pageKey: string | undefined;
    do {
      const res = await fetch(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_getAssetTransfers",
          params: [
            {
              fromAddress: SUBNET_FINAL_SPLIT,
              toAddress: DAO_ADDRESSES.treasury,
              contractAddresses: [USDC],
              category: ["erc20"],
              withMetadata: false,
              maxCount: "0x3e8",
              ...(pageKey ? { pageKey } : {}),
            },
          ],
        }),
        next: { revalidate: 300 },
      });
      if (!res.ok) throw new Error(`Alchemy ${res.status}`);
      const json = (await res.json()) as {
        result?: { transfers?: Array<{ value: number | null }>; pageKey?: string };
        error?: { message?: string };
      };
      if (json.error) throw new Error(json.error.message ?? "Alchemy error");
      for (const t of json.result?.transfers ?? []) {
        totalUsdc += t.value ?? 0;
        claimCount += 1;
      }
      pageKey = json.result?.pageKey;
    } while (pageKey);
    return { totalUsdc, claimCount };
  } catch {
    return null;
  }
});
