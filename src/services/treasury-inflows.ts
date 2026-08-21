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
 * in the SAME transaction (distribute-and-withdraw flows), and failing that by
 * the ledger credit that funded it — see `ledgerSplitForCredit`, which is what
 * recovers a bare `withdraw()` of balance deposited earlier. A split nobody has
 * mapped yet (two such ETH-paying splits, 0xd9b2…ad6b and 0xdac8…e54, have
 * already credited this treasury) still falls to the generic `splits` tag: an
 * unmapped split must surface as unclassified, never wear another product's
 * name. The one exception is spelled out at `UNATTRIBUTED_USDC_FALLBACK`.
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
  /** Hex block number — needed to bound the ledger scan in `ledgerSplitForCredit`. */
  blockNum?: string;
  rawContract?: { address?: string | null };
  metadata?: { blockTimestamp?: string };
}

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;

async function alchemyRpc<T>(
  method: string,
  params: unknown[],
  revalidate: number,
): Promise<T | null> {
  try {
    const res = await fetch(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      next: { revalidate },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: T; error?: unknown };
    return json.error ? null : (json.result ?? null);
  } catch {
    return null;
  }
}

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

/**
 * ERC-6909 `Transfer(address caller, address indexed sender, address indexed
 * receiver, uint256 indexed id, uint256 amount)` on the warehouse. For a CREDIT
 * into the treasury's ledger, `sender` (topic1) is the split that paid it — so
 * the warehouse ledger knows the product even when the withdrawal does not.
 */
const WAREHOUSE_TRANSFER_TOPIC =
  "0x1b3d7edb2e9c0b0e7c525b20aaaef0f5940d2ed71663c7d39266ecafac728859";

/** Warehouse token id for an ERC-20 is `uint256(uint160(token))`. */
const topicAddr = (a: string) => `0x${a.replace(/^0x/, "").toLowerCase().padStart(64, "0")}`;

/**
 * How far back a credit may sit from the withdrawal it funded. Observed on
 * chain: the distribute and the withdraw are separate transactions ~10 blocks
 * apart, run back-to-back by the same operator. 10k blocks (~5.5h on Base) is
 * generous for that and is also the widest range the public Base RPC accepts,
 * so the scan does not depend on a paid indexer plan to work.
 */
const LEDGER_SCAN_BLOCKS = 10_000;

/**
 * The product behind a BARE `withdraw()`.
 *
 * `splitSourceForTx` reads the withdrawal's own receipt, and a bare withdraw of
 * balance credited earlier contains no split event at all — just the warehouse
 * burn and the ERC-20 transfer out. That is why four subnet payouts totalling
 * ~$27 sat on the treasury page under the generic "Splits" tag.
 *
 * They are still attributable, just not from that receipt: the CREDIT event
 * that funded them names its split, and the amounts match exactly (7.843441
 * USDC credited by the subnet split at block 50182875, withdrawn at 50182885).
 * So scan the treasury's ledger credits in the window before the withdrawal and
 * match on the exact amount. All four of the rows this was written for resolve
 * that way — see `matchLedgerCredit` for what happens when they do not.
 */
async function ledgerSplitForCredit(
  blockNum: string | undefined,
  token: string,
  rawAmount: bigint,
): Promise<InflowSource | null> {
  if (!blockNum) return null;
  const to = parseInt(blockNum, 16);
  if (!Number.isFinite(to)) return null;

  const logs = await alchemyRpc<{ topics: string[]; data: string }[]>(
    "eth_getLogs",
    [
      {
        address: SPLITS_WAREHOUSE,
        topics: [
          WAREHOUSE_TRANSFER_TOPIC,
          null,
          topicAddr(DAO_ADDRESSES.treasury),
          topicAddr(token),
        ],
        fromBlock: `0x${Math.max(0, to - LEDGER_SCAN_BLOCKS).toString(16)}`,
        toBlock: `0x${to.toString(16)}`,
      },
    ],
    // Historical logs behind a finalized block never change.
    86400,
  );
  if (!logs) return null;

  return matchLedgerCredit(logs, rawAmount);
}

/**
 * The pure half of `ledgerSplitForCredit`: pick the product whose credit
 * matches this amount. Exported for the unit tests — everything above it is a
 * network call, and this is the part with the decisions in it.
 *
 * Ambiguity returns `null` rather than a first match: two mapped splits having
 * credited the identical amount inside the window means the chain genuinely
 * does not say which one this withdrawal drew on.
 */
export function matchLedgerCredit(
  logs: { topics: string[]; data: string }[],
  rawAmount: bigint,
): InflowSource | null {
  const matches = new Set<InflowSource>();
  for (const l of logs) {
    // data = abi.encode(caller, amount); the amount is the second word.
    if (l.data.length < 130) continue;
    let credited: bigint;
    try {
      credited = BigInt(`0x${l.data.slice(66, 130)}`);
    } catch {
      continue;
    }
    if (credited !== rawAmount) continue;
    const split = `0x${(l.topics[1] ?? "").slice(26)}`.toLowerCase();
    const product = SPLIT_PRODUCT[split];
    if (product) matches.add(product);
  }
  return matches.size === 1 ? [...matches][0] : null;
}

/**
 * Last-resort label for a warehouse USDC credit nothing could attribute.
 *
 * CALLER'S CHOICE, and it carries a known cost: today the subnet split is the
 * only mapped product paying the treasury in USDC, so this is right far more
 * often than not — but it is the same shape of assumption ("warehouse USDC =
 * subnet") that ran a swap-fee credit under the Morpheus name for weeks, and it
 * will mislabel the next USDC product the same way. Both attribution paths run
 * first, so it only fires when the receipt names no split AND no ledger credit
 * matches. Deleting this constant and its one use restores the strict "generic
 * when unproven" behaviour.
 */
const UNATTRIBUTED_USDC_FALLBACK: InflowSource = "subnet";

/**
 * Where a warehouse credit came from, best evidence first:
 *   1. a mapped split emitting in the credit's own transaction (distribute+withdraw)
 *   2. the ledger credit that funded a bare withdraw, matched by exact amount
 *   3. the USDC fallback above
 * ETH and WETH warehouse credits never reach step 3 — two unmapped splits pay
 * this treasury in ETH, and they are not the subnet.
 */
async function warehouseSource(
  t: AlchemyTransfer,
  asset: InflowAsset,
  amount: number,
): Promise<InflowSource> {
  const fromReceipt = await splitSourceForTx(t.hash as string);
  if (fromReceipt !== "splits") return fromReceipt;

  if (asset !== "USDC") return "splits";

  // USDC is 6dp and these are dollar-scale amounts — well inside the range
  // where the float round-trips exactly.
  const raw = BigInt(Math.round(amount * 1e6));
  const fromLedger = await ledgerSplitForCredit(t.blockNum, USDC, raw);
  return fromLedger ?? UNATTRIBUTED_USDC_FALLBACK;
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
      // Warehouse credits are attributed to a PRODUCT by `warehouseSource`
      // (see SPLIT_PRODUCT for why the sender address alone cannot: every
      // split shares this one warehouse, and the day two products' payouts
      // left it under one label has already happened — a swap-fee credit ran
      // on the public page as "Morpheus Subnet"). One immutable-receipt read
      // per warehouse row, plus a cached log scan only for the ones that
      // receipt cannot explain; everything else costs nothing extra.
      const source: InflowSource =
        from === DAO_ADDRESSES.auction.toLowerCase()
          ? "auction"
          : from === SPLITS_WAREHOUSE
            ? await warehouseSource(t, asset, amount)
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
 * All-time Morpheus subnet earnings. Splits pay through the warehouse (see the
 * SPLITS_WAREHOUSE note above — the split address is never the `from`), so
 * this walks every warehouse→treasury USDC transfer and keeps the ones
 * `warehouseSource` attributes to the subnet — literally the same call the
 * inflows feed makes, so the KPI and the tile below it cannot report different
 * subnet totals. The paged inflows feed above is a window and cannot
 * sum honestly; this lane's full history is tiny, and the per-tx receipts are
 * immutable and day-cached. `null` = could not determine — the KPI card
 * renders a dash, never a fabricated 0.
 */
export const loadSubnetEarnings = cache(async (): Promise<SubnetEarnings | null> => {
  if (!ALCHEMY_KEY) return null;
  try {
    const transfers: Array<{ value: number; hash: string; blockNum?: string }> = [];
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
              fromAddress: SPLITS_WAREHOUSE,
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
        result?: {
          transfers?: Array<{ value: number | null; hash?: string; blockNum?: string }>;
          pageKey?: string;
        };
        error?: { message?: string };
      };
      if (json.error) throw new Error(json.error.message ?? "Alchemy error");
      for (const t of json.result?.transfers ?? []) {
        if (t.hash) transfers.push({ value: t.value ?? 0, hash: t.hash, blockNum: t.blockNum });
      }
      pageKey = json.result?.pageKey;
    } while (pageKey);

    // The SAME classifier the inflows feed uses, not just the receipt read.
    // These two live on one screen — the KPI card at the top and the "Morpheus
    // Subnet" tile in the panel below — so a rule applied to one and not the
    // other puts two different subnet totals a few hundred pixels apart. Every
    // transfer here is USDC by construction (`contractAddresses: [USDC]`).
    const sources = await Promise.all(
      transfers.map((t) =>
        warehouseSource({ hash: t.hash, blockNum: t.blockNum }, "USDC", t.value),
      ),
    );
    let totalUsdc = 0;
    let claimCount = 0;
    for (let i = 0; i < transfers.length; i += 1) {
      if (sources[i] !== "subnet") continue;
      totalUsdc += transfers[i].value;
      claimCount += 1;
    }
    return { totalUsdc, claimCount };
  } catch {
    return null;
  }
});
