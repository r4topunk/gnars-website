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
 * ═══════════════════ THE SPLIT ADDRESS BOOK ═══════════════════
 *
 * Every split that has ever paid this treasury, in three tiers. Attribution is
 * per ORIGINATING SPLIT, not per warehouse: every split pays through the same
 * SplitsWarehouse address, so "warehouse USDC = subnet" was a rule with an
 * expiry date — and it expired. The swap-fee split distributed on 2026-06-22,
 * and that credit spent weeks on the public page labelled "Morpheus Subnet".
 *
 * TIER 1 — MAPPED (in SPLIT_PRODUCT below; their payouts wear a product tag):
 *   SUBNET_FINAL_SPLIT 0xcc7E…3A4E  → "subnet"
 *     Recipients (hash-verified 2026-08-19): Sopa Multisig 0x96C3…eEA2 80%,
 *     treasury 20%. Pays USDC. distributionIncentive 6.
 *   SWAP_FEE_SPLIT 0x15e6…0eae  → "swap"
 *     Gnars treasury 50 / operations wallet 50, read from its SplitUpdated
 *     event (see SWAP_FEE_RECIPIENT_BASE in config).
 *
 * TIER 2 — IDENTIFIED, RECIPIENTS VERIFIED, PRODUCT UNKNOWN (constants below;
 * deliberately NOT in SPLIT_PRODUCT — their payouts stay generic until a human
 * names them). Both were once suspected of being subnet splits; the on-chain
 * shape refutes that, so do not re-add the hypothesis:
 *   0xd9b2…ad6b — recipients (hash-verified 2026-08-19):
 *     0xEed9…a282 20%, treasury 80%. Diverges from the subnet pattern on every
 *     axis: counterparty is not the Sopa Multisig, the treasury share is
 *     INVERTED (80% here vs the subnet's 20%), it came from a different
 *     factory (0x5cba…21d1), has no distribution incentive, and pays ETH
 *     where the subnet lane pays USDC.
 *   0xdac8…e54 — recipients (hash-verified 2026-08-19):
 *     0x9ad8…E1c8 49.5%, treasury 49.5%, 0x9946…17a1 1%. Also unrelated to
 *     the [80/20] subnet shape. Pays ETH.
 *
 * TIER 3 — NOT SPLITS, NEVER SOURCES: SplitsWarehouse 0x8fb6…1fb8 is shared
 * transport for every split above; the legacy Ethereum-mainnet treasury
 * 0x4d3a…ce52 (config `GNARS_ADDRESSES_ETH.treasury`) is an obsolete DAO
 * address, not an income product; Seaport and the auction house have their
 * own tags outside this map.
 *
 * THE RULE FOR UNKNOWNS: a split absent from SPLIT_PRODUCT falls to the
 * generic `splits` tag — it must surface as unclassified, never wear another
 * product's name. Adding a product = verify the recipients against the stored
 * splitHash first (reconstruct from the creation event), then one entry here
 * plus its i18n strings and tile tone.
 */
const SPLIT_PRODUCT: Record<string, InflowSource> = {
  [SUBNET_FINAL_SPLIT]: "subnet",
  [SWAP_FEE_SPLIT]: "swap",
};

/** Tier-2 splits: investigated and hash-verified, product still unnamed (see
 * the address book above for their recipients and why they are NOT subnet).
 * Exported so future naming starts from the verified constants, not a re-dig. */
export const UNNAMED_VERIFIED_SPLITS = [
  "0xd9b22da0c190a90bcada99d69b0f5aeeaf10ad6b",
  "0xdac848cfe537b21eeb5e718422e4055644b29e54",
] as const;

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

/**
 * RETROACTIVE ATTRIBUTION for bare warehouse withdrawals.
 *
 * A `withdraw()` that only moves balance deposited earlier carries no split in
 * its own receipt — but the deposits that FORMED that balance do. All four
 * bare USDC withdrawals on this treasury to date were single-source Morpheus
 * money, provable one transaction back (verified on-chain 2026-08-19 by
 * bisecting the warehouse's historical `balanceOf`).
 *
 * The rule, decided with the operator: a withdrawal inherits a product only
 * when EVERY credit since the previous withdrawal came from that one product
 * AND the found credits fully cover the withdrawn amount. Mixed products,
 * partial coverage, or unattributable credits all fall back to the generic
 * `splits` tag — the honest floor never asserts more than the chain proves.
 */
export function decideRetroSource(
  credits: Array<{ amount: bigint; source: InflowSource }>,
  withdrawn: bigint,
): InflowSource {
  if (credits.length === 0) return "splits";
  const covered = credits.reduce((sum, c) => sum + c.amount, 0n);
  // The warehouse's withdraw leaves 1 unit behind as a gas optimization, so
  // credits and withdrawal can differ by a unit or two without being a gap.
  if (covered + 2n < withdrawn) return "splits";
  const products = new Set(credits.map((c) => c.source));
  if (products.size !== 1) return "splits";
  const only = credits[0].source;
  return only === "splits" ? "splits" : only;
}

/** ERC-6909 Transfer on the warehouse: (caller, from indexed, to indexed, id indexed; data = caller ++ amount). */
const WAREHOUSE_TRANSFER_TOPIC =
  "0x1b3d7edb2e9c0b0e7c525b20aaaef0f5940d2ed71663c7d39266ecafac728859";
/** balanceOf(address,uint256) selector, for historical warehouse balance reads. */
const BALANCE_OF_SELECTOR = "0x00fdd58e";
/** Free-tier Alchemy caps eth_getLogs at 10 blocks — the cheap window honors it. */
const CHEAP_WINDOW_BLOCKS = 9;
/** How far back the balance bisection may look (~35 days of Base blocks). */
const MAX_LOOKBACK_BLOCKS = 1_500_000;
/** Hard budget for historical eth_calls in one attribution. */
const MAX_BISECT_CALLS = 48;

const pad32 = (hex: string) => hex.toLowerCase().replace(/^0x/, "").padStart(64, "0");
const TREASURY_TOPIC = `0x${pad32(DAO_ADDRESSES.treasury)}`;

async function rpc<T>(method: string, params: unknown[], revalidate: number): Promise<T | null> {
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

interface WarehouseCreditLog {
  transactionHash: string;
  topics: string[];
  data: string;
}

/** Warehouse Transfer logs paying INTO the treasury's balance for one token, in a block range. */
async function treasuryCreditLogs(
  fromBlock: number,
  toBlock: number,
  tokenTopic: string,
): Promise<WarehouseCreditLog[] | null> {
  const logs = await rpc<WarehouseCreditLog[]>(
    "eth_getLogs",
    [
      {
        address: SPLITS_WAREHOUSE,
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        topics: [WAREHOUSE_TRANSFER_TOPIC, null, TREASURY_TOPIC, tokenTopic],
      },
    ],
    // Mined blocks are immutable; cache as long as Next allows.
    86400,
  );
  return logs;
}

const creditAmount = (log: WarehouseCreditLog): bigint => {
  // data = abi.encode(caller, amount)
  const word = log.data.slice(2 + 64, 2 + 128);
  return word ? BigInt(`0x${word}`) : 0n;
};

/** Treasury's warehouse balance for a token at a historical block. */
async function warehouseBalanceAt(block: number, tokenId: string): Promise<bigint | null> {
  const result = await rpc<string>(
    "eth_call",
    [
      {
        to: SPLITS_WAREHOUSE,
        data: `${BALANCE_OF_SELECTOR}${pad32(DAO_ADDRESSES.treasury)}${tokenId}`,
      },
      `0x${block.toString(16)}`,
    ],
    86400,
  );
  return result ? BigInt(result) : null;
}

/**
 * Attribute a bare warehouse withdrawal by the credits that formed its balance.
 *
 * Cheap path first: the operator habitually runs `distribute()` seconds before
 * `withdraw()`, so a 10-block look-back (the free-tier getLogs ceiling) finds
 * the credit almost always. When it doesn't cover the amount, a bounded
 * bisection of the historical balance locates each older credit block — ~20
 * calls per credit, all immutable and day-cached. Any failure or budget
 * exhaustion degrades to the generic `splits`, never to a guess.
 */
async function retroAttributeWithdraw(hash: string): Promise<InflowSource> {
  const receipt = await rpc<{
    blockNumber?: string;
    logs?: Array<{ address?: string; topics?: string[]; data?: string }>;
  }>("eth_getTransactionReceipt", [hash], 86400);
  if (!receipt?.blockNumber || !receipt.logs) return "splits";

  // The withdrawal burn: treasury's balance → 0x0, telling us token + amount.
  const burn = receipt.logs.find(
    (l) =>
      l.address?.toLowerCase() === SPLITS_WAREHOUSE &&
      l.topics?.[0] === WAREHOUSE_TRANSFER_TOPIC &&
      l.topics?.[1]?.toLowerCase() === TREASURY_TOPIC &&
      BigInt(l.topics?.[2] ?? "0x0") === 0n,
  );
  if (!burn?.topics?.[3] || !burn.data) return "splits";
  const tokenTopic = burn.topics[3];
  const withdrawn = creditAmount(burn as WarehouseCreditLog);
  if (withdrawn <= 0n) return "splits";

  const block = Number(receipt.blockNumber);

  const collectCredits = async (logs: WarehouseCreditLog[]) => {
    const credits: Array<{ amount: bigint; source: InflowSource }> = [];
    for (const log of logs) {
      // Skip the withdrawal's own tx and non-mint moves are fine to include:
      // anything that credited the treasury's balance counts as a source.
      if (log.transactionHash === hash) continue;
      credits.push({
        amount: creditAmount(log),
        source: await splitSourceForTx(log.transactionHash),
      });
    }
    return credits;
  };

  // Cheap path: credits within the last 10 blocks (distribute-then-withdraw).
  const nearLogs = await treasuryCreditLogs(block - CHEAP_WINDOW_BLOCKS, block, tokenTopic);
  if (nearLogs === null) return "splits";
  const nearCredits = await collectCredits(nearLogs);
  const nearDecision = decideRetroSource(nearCredits, withdrawn);
  if (nearDecision !== "splits" || nearCredits.length > 0) {
    // Either attributed, or the near credits exist but are mixed/unattributable
    // — in which case older history cannot make the answer MORE certain.
    if (nearCredits.reduce((s, c) => s + c.amount, 0n) + 2n >= withdrawn) return nearDecision;
  }

  // Bisect the balance history for the remaining credits.
  let calls = 0;
  const bal = async (b: number) => {
    calls += 1;
    return warehouseBalanceAt(b, tokenTopic.slice(2));
  };
  const lo = Math.max(1, block - MAX_LOOKBACK_BLOCKS);
  const hi = block - CHEAP_WINDOW_BLOCKS - 1;
  const [balLo, balHi] = [await bal(lo), await bal(hi)];
  // The whole balance must be explainable inside the window: a lookback start
  // with money already sitting there means unseen, unattributable credits.
  if (balLo === null || balHi === null || balLo > 2n) return "splits";

  const stepBlocks: number[] = [];
  const findSteps = async (a: number, b: number, balA: bigint, balB: bigint): Promise<boolean> => {
    if (balA >= balB) return true;
    if (b - a <= 1) {
      stepBlocks.push(b);
      return true;
    }
    if (calls >= MAX_BISECT_CALLS) return false;
    const mid = Math.floor((a + b) / 2);
    const balMid = await bal(mid);
    if (balMid === null) return false;
    return (await findSteps(a, mid, balA, balMid)) && (await findSteps(mid, b, balMid, balB));
  };
  if (!(await findSteps(lo, hi, balLo, balHi))) return "splits";

  const credits = [...nearCredits];
  for (const stepBlock of stepBlocks) {
    const logs = await treasuryCreditLogs(stepBlock, stepBlock, tokenTopic);
    if (logs === null) return "splits";
    credits.push(...(await collectCredits(logs)));
  }
  return decideRetroSource(credits, withdrawn);
}

/**
 * Full attribution for a warehouse-sent inflow: the credit's own receipt
 * first (distribute-and-withdraw), retroactive balance tracing second (bare
 * withdraw), generic `splits` as the unchanged honest floor.
 */
async function warehouseSource(hash: string): Promise<InflowSource> {
  const direct = await splitSourceForTx(hash);
  if (direct !== "splits") return direct;
  return retroAttributeWithdraw(hash);
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
            ? await warehouseSource(t.hash)
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
 * this walks every warehouse→treasury USDC transfer and keeps the ones whose
 * transaction the subnet's final split emitted in, the same attribution rule
 * the inflows ledger uses. The paged inflows feed above is a window and cannot
 * sum honestly; this lane's full history is tiny, and the per-tx receipts are
 * immutable and day-cached. `null` = could not determine — the KPI card
 * renders a dash, never a fabricated 0.
 */
export const loadSubnetEarnings = cache(async (): Promise<SubnetEarnings | null> => {
  if (!ALCHEMY_KEY) return null;
  try {
    const transfers: Array<{ value: number; hash: string }> = [];
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
          transfers?: Array<{ value: number | null; hash?: string }>;
          pageKey?: string;
        };
        error?: { message?: string };
      };
      if (json.error) throw new Error(json.error.message ?? "Alchemy error");
      for (const t of json.result?.transfers ?? []) {
        if (t.hash) transfers.push({ value: t.value ?? 0, hash: t.hash });
      }
      pageKey = json.result?.pageKey;
    } while (pageKey);

    const sources = await Promise.all(transfers.map((t) => warehouseSource(t.hash)));
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
