/**
 * export-creator-liquidity.ts
 *
 * Snapshot Gnars DAO members' Zora-created coins + the full set of coins
 * "backed by Gnars" (paired with GNARS or with a member's creator coin) so we
 * can plan a liquidity migration to the new Gnars token on Clanker via
 * upgrader.co.
 *
 * Outputs three CSVs in `output/`:
 *   - creators-YYYYMMDD-HHMMSS.csv  (one row per member who created >=1 coin)
 *   - coins-YYYYMMDD-HHMMSS.csv     (one row per member-created coin)
 *   - migration-candidates-YYYYMMDD-HHMMSS.csv (ranked deposit list for upgrader)
 *
 * Stages (each cached on disk under output/cache so reruns skip done work):
 *   1. Members        — paginated Goldsky subgraph query (+ ownerCount sanity check)
 *   2. ProfileCoins   — Zora SDK getProfileCoins per member (paginated)
 *   3. CoinPools      — GeckoTerminal best-pool per member-created coin (rate-limited)
 *   4. BackedPools    — GeckoTerminal /tokens/{seed}/pools for GNARS + each member
 *                       creator coin → finds content coins paired with them
 *   5. ContentCoins   — Zora getCoin metadata for downstream coins discovered
 *                       in stage 4 that we don't already know about
 *   6. Enrichment     — Neynar bulk-by-address + ENS reverse lookup via mainnet
 *   7. Output         — aggregate, sort, write CSVs (incl. migration ranking)
 *
 * Run:
 *   pnpm tsx scripts/export-creator-liquidity.ts
 *
 * Resume: rerun the same command. Cached intermediate files are reused.
 * To force a refresh of one stage, delete the corresponding folder under
 * output/cache/ (e.g. `rm -rf output/cache/profile-coins`).
 *
 * Required env (loaded from .env.local automatically):
 *   NEXT_PUBLIC_GOLDSKY_PROJECT_ID  — Builder DAO subgraph project id
 *   NEXT_PUBLIC_ZORA_API_KEY        — Zora API key (highly recommended; raises rate limits)
 *   ALCHEMY_API_KEY                 — for ENS reverse lookup on mainnet
 * Optional:
 *   NEYNAR_API_KEY                  — Farcaster enrichment (creator_farcaster, twitter via verified accounts)
 *   GECKOTERMINAL_API_KEY           — paid tier (raises rate limits beyond 30/min)
 *   NEXT_PUBLIC_TOKEN_ADDRESS       — DAO governance token address override (default: Gnars).
 *                                     NOTE: this var is also used by the Next app for *its* DAO.
 *                                     If `.env.local` points it elsewhere you'll snapshot the
 *                                     wrong DAO — pass it inline when running this script:
 *                                     NEXT_PUBLIC_TOKEN_ADDRESS=0x880fb3… pnpm tsx scripts/...
 *   GNARS_ZORA_TOKEN                — GNARS Zora ERC20 override (default: 0x0cf0…b23b)
 */

import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getCoin, getProfileCoins, setApiKey } from "@zoralabs/coins-sdk";
import { createPublicClient, http, isAddress, type Address } from "viem";
import { mainnet } from "viem/chains";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// Load .env.local without dotenv dependency (Node >= 20.6).
// Searches the script's repo, the cwd, and parent dirs of cwd so the script
// works whether invoked from a worktree or the main repo.
function findEnvFile(): string | null {
  const candidates = [path.join(ROOT, ".env.local")];
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    candidates.push(path.join(dir, ".env.local"));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

try {
  const envFile = findEnvFile();
  if (envFile) {
    (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(envFile);
  }
} catch (err) {
  console.warn("[env] could not load .env.local:", err);
}

// Output goes next to wherever the user invoked the script from so it's easy
// to find. Override via OUTPUT_DIR env var if needed.
const OUTPUT_DIR = process.env.OUTPUT_DIR
  ? path.resolve(process.env.OUTPUT_DIR)
  : path.join(process.cwd(), "output");
const CACHE_DIR = path.join(OUTPUT_DIR, "cache");
const CACHE_MEMBERS = path.join(CACHE_DIR, "members.json");
const CACHE_PROFILE_COINS = path.join(CACHE_DIR, "profile-coins");
const CACHE_GECKO = path.join(CACHE_DIR, "gecko-pools");
const CACHE_GECKO_BACKED = path.join(CACHE_DIR, "gecko-backed-pools");
const CACHE_ZORA_COINS = path.join(CACHE_DIR, "zora-coins");
const CACHE_FARCASTER = path.join(CACHE_DIR, "farcaster.json");
const CACHE_ENS = path.join(CACHE_DIR, "ens.json");

// DAO governance token (NFT, ERC721) — used to enumerate members via subgraph
const DAO_TOKEN_ADDRESS = (
  process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17"
).toLowerCase();
// GNARS Zora ERC20 — the actual token being migrated to Clanker
const GNARS_ZORA_TOKEN = (
  process.env.GNARS_ZORA_TOKEN || "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b"
).toLowerCase();
// Backwards-compat alias retained for any external callers; new code uses GNARS_ZORA_TOKEN.
const GNARS_CREATOR_COIN = GNARS_ZORA_TOKEN;
// Pool root tokens we never want to surface as migration "downstream" coins.
const ZORA_TOKEN_BASE = "0x1111111111166b7fe7bd91427724b487980afc69";
const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const WETH_BASE = "0x4200000000000000000000000000000000000006";
const ROOT_TOKENS = new Set<string>([
  ZORA_TOKEN_BASE,
  USDC_BASE,
  WETH_BASE,
  "0x0000000000000000000000000000000000000000",
]);
const GOLDSKY_PROJECT_ID =
  process.env.NEXT_PUBLIC_GOLDSKY_PROJECT_ID || "project_cm33ek8kjx6pz010i2c3w8z25";
const SUBGRAPH_URL = `https://api.goldsky.com/api/public/${GOLDSKY_PROJECT_ID}/subgraphs/nouns-builder-base-mainnet/latest/gn`;
const ZORA_API_KEY = process.env.NEXT_PUBLIC_ZORA_API_KEY;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const GECKO_API_KEY = process.env.GECKOTERMINAL_API_KEY;

if (ZORA_API_KEY) setApiKey(ZORA_API_KEY);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemberRow {
  owner: string;
  delegate: string;
  daoTokenCount: number;
}

interface ProfileCoin {
  address: string;
  name: string;
  symbol: string;
  description?: string;
  totalSupply?: string;
  totalVolume?: string;
  volume24h?: string;
  marketCap?: string;
  marketCapDelta24h?: string;
  createdAt?: string;
  creatorAddress?: string;
  poolCurrencyAddress?: string;
  poolCurrencyName?: string;
  poolCurrencyDecimals?: number;
  priceInUsdc?: string;
  uniqueHolders?: number;
  zoraTwitter?: string;
  zoraFarcaster?: string;
  zoraInstagram?: string;
  zoraTiktok?: string;
}

interface GeckoPool {
  poolAddress: string;
  poolUrl: string;
  reserveInUsd: number;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  baseSymbol?: string;
  quoteSymbol?: string;
  baseReserveUsd?: number;
  quoteReserveUsd?: number;
  feeBps?: number;
  fdv?: number;
  marketCap?: number;
  volume24h?: number;
  dex?: string;
}

interface FarcasterRecord {
  username: string;
  displayName: string | null;
  followerCount: number;
  bio: string | null;
  twitter: string | null; // resolved from verified accounts when available
}

interface CreatorAggregate {
  address: string;
  ens: string | null;
  farcaster: FarcasterRecord | null;
  twitter: string | null;
  email: string | null;
  daoTokenCount: number;
  delegate: string;
  coinsCount: number;
  coinsWithLiquidity: number;
  totalTvlUsd: number;
  gnarsPairedTvlUsd: number;
  topCoinSymbol: string | null;
  topCoinTvlUsd: number;
  // Sum of `uniqueHolders` reported by Zora across all of this creator's coins.
  // Useful for sizing an airdrop if we migrate their coins too.
  totalHoldersAcrossCoins: number;
  // The member's "creator coin" address (paired with a root currency), if known.
  creatorCoinAddress: string | null;
  creatorCoinSymbol: string | null;
  creatorCoinTvlUsd: number;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function now(): string {
  return new Date().toISOString().slice(11, 19);
}

function log(msg: string): void {
  console.log(`[${now()}] ${msg}`);
}

function warn(msg: string, err?: unknown): void {
  const detail = err instanceof Error ? err.message : err ? String(err) : "";
  console.warn(`[${now()}] WARN ${msg}${detail ? ` — ${detail}` : ""}`);
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const buf = await fs.readFile(file, "utf-8");
    return JSON.parse(buf) as T;
  } catch {
    return null;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 5,
  baseDelayMs = 800,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status =
        err && typeof err === "object" && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      const transient =
        !status || status === 429 || (status >= 500 && status < 600);
      if (!transient || i === attempts - 1) throw err;
      // 429 → much longer waits since GeckoTerminal's free-tier window is per-minute
      const delay =
        status === 429
          ? Math.min(60_000, 8_000 * 2 ** i) + Math.floor(Math.random() * 1_000)
          : baseDelayMs * 2 ** i + Math.floor(Math.random() * 200);
      warn(
        `${label} failed (${status ?? "?"}), retry ${i + 1}/${attempts - 1} in ${delay}ms`,
        err,
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "number" ? value.toString() : String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCsv(file: string, headers: string[], rows: unknown[][]): Promise<void> {
  const lines = [headers.join(","), ...rows.map((r) => r.map(csvEscape).join(","))];
  return fs.writeFile(file, lines.join("\n") + "\n");
}

function timestampSuffix(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
function findEmail(...texts: Array<string | null | undefined>): string | null {
  for (const text of texts) {
    if (!text) continue;
    const match = text.match(EMAIL_RE);
    if (match) return match[0];
  }
  return null;
}

function tierFor(tvl: number): "high" | "med" | "low" | "none" {
  if (tvl >= 10_000) return "high";
  if (tvl >= 1_000) return "med";
  if (tvl > 0) return "low";
  return "none";
}

// ---------------------------------------------------------------------------
// Stage 1: Members (Goldsky subgraph)
// ---------------------------------------------------------------------------

async function subgraphQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`subgraph ${res.status}: ${text.slice(0, 200)}`);
    (err as { status?: number }).status = res.status;
    throw err;
  }
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`subgraph errors: ${json.errors.map((e) => e.message).join(", ")}`);
  }
  return json.data as T;
}

async function fetchDaoOwnerCount(): Promise<number | null> {
  try {
    const data = await withRetry("dao ownerCount", () =>
      subgraphQuery<{ dao: { ownerCount: number } | null }>(
        `query Dao($dao: ID!) { dao(id: $dao) { ownerCount } }`,
        { dao: DAO_TOKEN_ADDRESS },
      ),
    );
    return data.dao?.ownerCount ?? null;
  } catch (err) {
    warn("dao ownerCount lookup failed", err);
    return null;
  }
}

async function fetchAllMembers(): Promise<MemberRow[]> {
  const expectedCount = await fetchDaoOwnerCount();
  const cached = await readJson<MemberRow[]>(CACHE_MEMBERS);

  // Sanity-check the cache: if it's clearly truncated (e.g. an earlier broken
  // run that only got the first 14 holders for a 1k-holder DAO) we discard it
  // and refetch instead of silently emitting bad CSVs.
  if (cached && cached.length > 0) {
    const cacheLooksTruncated =
      expectedCount !== null && cached.length < Math.floor(expectedCount * 0.5);
    if (cacheLooksTruncated) {
      warn(
        `members cache looks truncated (${cached.length}/${expectedCount}) — discarding and refetching`,
      );
    } else {
      log(`members: loaded ${cached.length} from cache`);
      if (expectedCount !== null && cached.length < expectedCount) {
        warn(
          `members cache count (${cached.length}) < dao.ownerCount (${expectedCount}); rerun with empty cache to refresh`,
        );
      }
      return cached;
    }
  }

  log(
    `members: fetching from Goldsky${expectedCount !== null ? ` (expecting ~${expectedCount})` : ""}…`,
  );
  const PAGE_SIZE = 1000;
  const all: MemberRow[] = [];
  let skip = 0;

  while (true) {
    const data = await withRetry("members page", () =>
      subgraphQuery<{
        daotokenOwners: Array<{ owner: string; delegate: string; daoTokenCount: number }>;
      }>(
        `query Members($dao: ID!, $first: Int!, $skip: Int!) {
          daotokenOwners(
            where: { dao: $dao }
            orderBy: daoTokenCount
            orderDirection: desc
            first: $first
            skip: $skip
          ) {
            owner
            delegate
            daoTokenCount
          }
        }`,
        { dao: DAO_TOKEN_ADDRESS, first: PAGE_SIZE, skip },
      ),
    );

    const rows = data.daotokenOwners || [];
    if (rows.length === 0) break;

    for (const row of rows) {
      all.push({
        owner: row.owner.toLowerCase(),
        delegate: (row.delegate || row.owner).toLowerCase(),
        daoTokenCount: Number(row.daoTokenCount ?? 0),
      });
    }

    if (rows.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
    log(`members: fetched ${all.length}, continuing…`);
  }

  if (expectedCount !== null && all.length < expectedCount) {
    warn(
      `members fetch returned ${all.length} but dao.ownerCount=${expectedCount}; subgraph may be lagging`,
    );
  }

  await writeJson(CACHE_MEMBERS, all);
  log(`members: total ${all.length} (cached)`);
  return all;
}

// ---------------------------------------------------------------------------
// Stage 2: Profile coins per member (Zora SDK)
// ---------------------------------------------------------------------------

interface ProfileCoinsForMember {
  fetchedAt: number;
  zoraHandle: string | null;
  socials: {
    twitter: string | null;
    farcaster: string | null;
    instagram: string | null;
    tiktok: string | null;
  };
  coins: ProfileCoin[];
}

function mapCoinNode(node: unknown): ProfileCoin | null {
  if (!node || typeof node !== "object") return null;
  const n = node as Record<string, unknown>;
  const address = typeof n.address === "string" ? n.address.toLowerCase() : "";
  if (!address) return null;
  const tokenPrice = (n.tokenPrice ?? {}) as Record<string, unknown>;
  const poolCurrency = (n.poolCurrencyToken ?? {}) as Record<string, unknown>;
  const creatorProfile = (n.creatorProfile ?? {}) as Record<string, unknown>;
  const socials = (creatorProfile.socialAccounts ?? {}) as Record<string, unknown>;
  const getSocial = (key: string): string | undefined => {
    const obj = socials[key] as Record<string, unknown> | undefined;
    const u = obj?.username;
    return typeof u === "string" && u.length > 0 ? u : undefined;
  };

  return {
    address,
    name: typeof n.name === "string" ? n.name : "",
    symbol: typeof n.symbol === "string" ? n.symbol : "",
    description: typeof n.description === "string" ? n.description : undefined,
    totalSupply: typeof n.totalSupply === "string" ? n.totalSupply : undefined,
    totalVolume: typeof n.totalVolume === "string" ? n.totalVolume : undefined,
    volume24h: typeof n.volume24h === "string" ? n.volume24h : undefined,
    marketCap: typeof n.marketCap === "string" ? n.marketCap : undefined,
    marketCapDelta24h:
      typeof n.marketCapDelta24h === "string" ? n.marketCapDelta24h : undefined,
    createdAt: typeof n.createdAt === "string" ? n.createdAt : undefined,
    creatorAddress:
      typeof n.creatorAddress === "string" ? n.creatorAddress.toLowerCase() : undefined,
    poolCurrencyAddress:
      typeof poolCurrency.address === "string" ? poolCurrency.address.toLowerCase() : undefined,
    poolCurrencyName: typeof poolCurrency.name === "string" ? poolCurrency.name : undefined,
    poolCurrencyDecimals:
      typeof poolCurrency.decimals === "number" ? poolCurrency.decimals : undefined,
    priceInUsdc: typeof tokenPrice.priceInUsdc === "string" ? tokenPrice.priceInUsdc : undefined,
    uniqueHolders: typeof n.uniqueHolders === "number" ? n.uniqueHolders : undefined,
    zoraTwitter: getSocial("twitter"),
    zoraFarcaster: getSocial("farcaster"),
    zoraInstagram: getSocial("instagram"),
    zoraTiktok: getSocial("tiktok"),
  };
}

async function fetchProfileCoinsForMember(address: string): Promise<ProfileCoinsForMember> {
  const cacheFile = path.join(CACHE_PROFILE_COINS, `${address}.json`);
  const cached = await readJson<ProfileCoinsForMember>(cacheFile);
  if (cached) return cached;

  const coins: ProfileCoin[] = [];
  let after: string | undefined = undefined;
  let zoraHandle: string | null = null;
  const socials = { twitter: null, farcaster: null, instagram: null, tiktok: null } as {
    twitter: string | null;
    farcaster: string | null;
    instagram: string | null;
    tiktok: string | null;
  };

  for (let page = 0; page < 10; page++) {
    const response = await withRetry(`zora profileCoins ${address}`, () =>
      getProfileCoins({ identifier: address, count: 50, after, chainIds: [8453] }),
    );

    const profile = response?.data?.profile;
    if (!profile) break;

    if (!zoraHandle && typeof profile.handle === "string") zoraHandle = profile.handle;
    const profileSocials = (profile as { socialAccounts?: Record<string, { username?: string }> })
      .socialAccounts;
    if (profileSocials) {
      for (const key of Object.keys(socials) as Array<keyof typeof socials>) {
        const u = profileSocials[key]?.username;
        if (typeof u === "string" && u.length > 0 && !socials[key]) {
          socials[key] = u;
        }
      }
    }

    const edges = profile.createdCoins?.edges ?? [];
    for (const edge of edges) {
      const node = edge?.node;
      const mapped = mapCoinNode(node);
      if (mapped) coins.push(mapped);
    }

    const pageInfo = (profile.createdCoins as { pageInfo?: { hasNextPage?: boolean; endCursor?: string } })
      ?.pageInfo;
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) break;
    after = pageInfo.endCursor;
  }

  const result: ProfileCoinsForMember = {
    fetchedAt: Date.now(),
    zoraHandle,
    socials,
    coins,
  };
  await writeJson(cacheFile, result);
  return result;
}

async function fetchAllProfileCoins(
  members: MemberRow[],
): Promise<Map<string, ProfileCoinsForMember>> {
  await ensureDir(CACHE_PROFILE_COINS);
  const map = new Map<string, ProfileCoinsForMember>();
  const CONCURRENCY = 4;
  const queue = [...members];
  let done = 0;
  let withCoins = 0;

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const m = queue.shift();
      if (!m) break;
      try {
        const result = await fetchProfileCoinsForMember(m.owner);
        map.set(m.owner, result);
        if (result.coins.length > 0) withCoins++;
      } catch (err) {
        warn(`profileCoins ${m.owner}`, err);
        // Empty record so we don't retry on next stage; cache miss handled by file presence.
        map.set(m.owner, {
          fetchedAt: Date.now(),
          zoraHandle: null,
          socials: { twitter: null, farcaster: null, instagram: null, tiktok: null },
          coins: [],
        });
      }
      done++;
      if (done % 25 === 0 || done === members.length) {
        log(`profileCoins: ${done}/${members.length} (with coins: ${withCoins})`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return map;
}

// ---------------------------------------------------------------------------
// Stage 3: GeckoTerminal pools per coin
// ---------------------------------------------------------------------------

const GECKO_BASE = "https://api.geckoterminal.com/api/v2";
// Free tier is documented as 30/min but in practice the window resets are
// stricter — pacing at ~22/min keeps us comfortably under without throttling.
const GECKO_RATE_DELAY_MS = GECKO_API_KEY ? 100 : 2700;

async function geckoFetch<T>(url: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json;version=20230302" };
  if (GECKO_API_KEY) headers["x-cg-pro-api-key"] = GECKO_API_KEY;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`geckoterminal ${res.status}: ${text.slice(0, 200)}`);
    (err as { status?: number }).status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

interface GeckoTokenPoolsResponse {
  data?: Array<{
    id: string;
    type: string;
    attributes?: {
      address?: string;
      name?: string;
      pool_created_at?: string;
      base_token_price_usd?: string;
      quote_token_price_usd?: string;
      reserve_in_usd?: string;
      market_cap_usd?: string | null;
      fdv_usd?: string | null;
      volume_usd?: { h24?: string };
      pool_fee_bps?: number;
      base_token_id?: string;
      dex_id?: string;
      transactions?: { h24?: { buys?: number; sells?: number } };
    };
    relationships?: {
      base_token?: { data?: { id?: string } };
      quote_token?: { data?: { id?: string } };
      dex?: { data?: { id?: string } };
    };
  }>;
  included?: Array<{
    id: string;
    type: string;
    attributes?: { symbol?: string; address?: string };
  }>;
}

function pickBestPool(
  pools: NonNullable<GeckoTokenPoolsResponse["data"]>,
): NonNullable<GeckoTokenPoolsResponse["data"]>[number] | null {
  if (pools.length === 0) return null;
  return [...pools].sort((a, b) => {
    const av = parseFloat(a.attributes?.reserve_in_usd ?? "0") || 0;
    const bv = parseFloat(b.attributes?.reserve_in_usd ?? "0") || 0;
    return bv - av;
  })[0];
}

async function fetchPoolForCoin(coinAddress: string): Promise<GeckoPool | null> {
  const cacheFile = path.join(CACHE_GECKO, `${coinAddress.toLowerCase()}.json`);
  const cached = await readJson<{ pool: GeckoPool | null; failed?: boolean }>(cacheFile);
  // Cached entries that genuinely returned "no pool" (404) are kept; previous
  // 429-exhausted runs are flagged so we retry instead of silently emitting null.
  if (cached && !cached.failed) return cached.pool;

  const url = `${GECKO_BASE}/networks/base/tokens/${coinAddress}/pools?page=1&include=base_token,quote_token,dex`;
  let pool: GeckoPool | null = null;
  let failed = false;
  try {
    const json = await withRetry(`gecko ${coinAddress}`, () =>
      geckoFetch<GeckoTokenPoolsResponse>(url),
    );
    const data = json.data ?? [];
    const top = pickBestPool(data);
    if (top) {
      const a = top.attributes ?? {};
      const baseId = top.relationships?.base_token?.data?.id ?? "";
      const quoteId = top.relationships?.quote_token?.data?.id ?? "";
      const dexId = top.relationships?.dex?.data?.id ?? a.dex_id ?? "";
      const includedSymbol = (id: string): string | undefined =>
        json.included?.find((i) => i.id === id)?.attributes?.symbol;
      const includedAddress = (id: string): string | undefined =>
        json.included?.find((i) => i.id === id)?.attributes?.address?.toLowerCase();

      const reserveInUsd = parseFloat(a.reserve_in_usd ?? "0") || 0;
      const basePrice = parseFloat(a.base_token_price_usd ?? "0") || 0;
      const quotePrice = parseFloat(a.quote_token_price_usd ?? "0") || 0;

      // GeckoTerminal does not expose per-side reserves directly. We approximate
      // the split assuming ~50/50 pool composition (true for V3/V4 around the
      // active tick); for migration triage this is good enough. A more precise
      // figure requires reading PoolManager state on-chain.
      const half = reserveInUsd / 2;

      pool = {
        poolAddress: a.address?.toLowerCase() ?? top.id,
        poolUrl: `https://www.geckoterminal.com/base/pools/${a.address?.toLowerCase() ?? top.id}`,
        reserveInUsd,
        baseTokenAddress: includedAddress(baseId) ?? "",
        quoteTokenAddress: includedAddress(quoteId) ?? "",
        baseSymbol: includedSymbol(baseId),
        quoteSymbol: includedSymbol(quoteId),
        baseReserveUsd: basePrice > 0 ? half : undefined,
        quoteReserveUsd: quotePrice > 0 ? half : undefined,
        feeBps: typeof a.pool_fee_bps === "number" ? a.pool_fee_bps : undefined,
        fdv: a.fdv_usd ? parseFloat(a.fdv_usd) : undefined,
        marketCap: a.market_cap_usd ? parseFloat(a.market_cap_usd) : undefined,
        volume24h: a.volume_usd?.h24 ? parseFloat(a.volume_usd.h24) : undefined,
        dex: dexId,
      };
    }
  } catch (err) {
    const status = (err as { status?: number })?.status;
    pool = null;
    if (status === 404) {
      // genuinely no pool exists yet — cache as a final answer
    } else {
      // 429/5xx after retries — keep the entry but flag it so a rerun retries
      failed = true;
      warn(`gecko ${coinAddress}`, err);
    }
  }

  await writeJson(cacheFile, failed ? { pool: null, failed: true } : { pool });
  return pool;
}

async function fetchAllPools(coins: string[]): Promise<Map<string, GeckoPool | null>> {
  await ensureDir(CACHE_GECKO);
  const map = new Map<string, GeckoPool | null>();
  let done = 0;
  let withPool = 0;
  let failed = 0;
  const startedAt = Date.now();

  for (const coin of coins) {
    try {
      const pool = await fetchPoolForCoin(coin);
      map.set(coin.toLowerCase(), pool);
      if (pool) withPool++;
    } catch (err) {
      warn(`gecko ${coin}`, err);
      map.set(coin.toLowerCase(), null);
      failed++;
    }
    done++;
    if (done % 10 === 0 || done === coins.length) {
      const elapsedSec = (Date.now() - startedAt) / 1000;
      const rate = done / elapsedSec;
      const remaining = coins.length - done;
      const etaSec = rate > 0 ? remaining / rate : 0;
      log(
        `gecko: ${done}/${coins.length} (with pool: ${withPool}, failed: ${failed}, ETA: ${Math.ceil(etaSec)}s)`,
      );
    }
    await sleep(GECKO_RATE_DELAY_MS);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Stage 3b: All pools for a seed token (used to walk Gnars-backed graph)
// ---------------------------------------------------------------------------

interface BackedPoolEntry {
  poolAddress: string;
  poolUrl: string;
  reserveInUsd: number;
  volume24h?: number;
  feeBps?: number;
  dex?: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  baseSymbol?: string;
  quoteSymbol?: string;
  // The "other side" of the pool from the perspective of the seed.
  otherTokenAddress: string;
  otherSymbol?: string;
}

function mapPoolToBackedEntry(
  raw: NonNullable<GeckoTokenPoolsResponse["data"]>[number],
  included: GeckoTokenPoolsResponse["included"],
  seed: string,
): BackedPoolEntry | null {
  const a = raw.attributes ?? {};
  const baseId = raw.relationships?.base_token?.data?.id ?? "";
  const quoteId = raw.relationships?.quote_token?.data?.id ?? "";
  const dexId = raw.relationships?.dex?.data?.id ?? a.dex_id ?? "";
  const lookupAddress = (id: string): string | undefined =>
    included?.find((i) => i.id === id)?.attributes?.address?.toLowerCase();
  const lookupSymbol = (id: string): string | undefined =>
    included?.find((i) => i.id === id)?.attributes?.symbol;

  const baseAddr = lookupAddress(baseId) ?? "";
  const quoteAddr = lookupAddress(quoteId) ?? "";
  if (!baseAddr || !quoteAddr) return null;

  const seedLower = seed.toLowerCase();
  const otherAddr = baseAddr === seedLower ? quoteAddr : baseAddr;
  const otherSym = baseAddr === seedLower ? lookupSymbol(quoteId) : lookupSymbol(baseId);

  return {
    poolAddress: a.address?.toLowerCase() ?? raw.id,
    poolUrl: `https://www.geckoterminal.com/base/pools/${a.address?.toLowerCase() ?? raw.id}`,
    reserveInUsd: parseFloat(a.reserve_in_usd ?? "0") || 0,
    volume24h: a.volume_usd?.h24 ? parseFloat(a.volume_usd.h24) : undefined,
    feeBps: typeof a.pool_fee_bps === "number" ? a.pool_fee_bps : undefined,
    dex: dexId,
    baseTokenAddress: baseAddr,
    quoteTokenAddress: quoteAddr,
    baseSymbol: lookupSymbol(baseId),
    quoteSymbol: lookupSymbol(quoteId),
    otherTokenAddress: otherAddr,
    otherSymbol: otherSym,
  };
}

async function fetchPoolsForSeed(seed: string): Promise<BackedPoolEntry[]> {
  const seedLower = seed.toLowerCase();
  const cacheFile = path.join(CACHE_GECKO_BACKED, `${seedLower}.json`);
  const cached = await readJson<{ pools: BackedPoolEntry[]; failed?: boolean }>(cacheFile);
  if (cached && !cached.failed) return cached.pools;

  const collected: BackedPoolEntry[] = [];
  let failed = false;
  // GeckoTerminal returns at most 100 pools across paginated responses for
  // /networks/{network}/tokens/{addr}/pools. Free tier docs cap at 10 pages.
  for (let page = 1; page <= 10; page++) {
    const url = `${GECKO_BASE}/networks/base/tokens/${seedLower}/pools?page=${page}&include=base_token,quote_token,dex`;
    try {
      const json = await withRetry(`gecko-pools-page ${seedLower}#${page}`, () =>
        geckoFetch<GeckoTokenPoolsResponse>(url),
      );
      const pageRows = json.data ?? [];
      if (pageRows.length === 0) break;
      for (const raw of pageRows) {
        const entry = mapPoolToBackedEntry(raw, json.included, seedLower);
        if (entry) collected.push(entry);
      }
      // Most tokens have a single page; bail when underflow.
      if (pageRows.length < 20) break;
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 404) break;
      failed = true;
      warn(`gecko-pools ${seedLower}#${page}`, err);
      break;
    }
    await sleep(GECKO_RATE_DELAY_MS);
  }

  // Dedupe by pool address (paginated responses can overlap).
  const dedup = new Map<string, BackedPoolEntry>();
  for (const p of collected) dedup.set(p.poolAddress, p);
  const pools = [...dedup.values()];

  await writeJson(cacheFile, failed ? { pools: [], failed: true } : { pools });
  return pools;
}

async function fetchAllBackedPools(seeds: string[]): Promise<Map<string, BackedPoolEntry[]>> {
  await ensureDir(CACHE_GECKO_BACKED);
  const map = new Map<string, BackedPoolEntry[]>();
  let done = 0;
  for (const seed of seeds) {
    try {
      const pools = await fetchPoolsForSeed(seed);
      map.set(seed.toLowerCase(), pools);
    } catch (err) {
      warn(`backed-pools ${seed}`, err);
      map.set(seed.toLowerCase(), []);
    }
    done++;
    if (done % 5 === 0 || done === seeds.length) {
      log(`backedPools: ${done}/${seeds.length}`);
    }
    await sleep(GECKO_RATE_DELAY_MS);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Stage 3c: Zora metadata for downstream content coins
// ---------------------------------------------------------------------------

async function fetchContentCoinMetadata(
  coinAddresses: string[],
): Promise<Map<string, ProfileCoin>> {
  await ensureDir(CACHE_ZORA_COINS);
  const map = new Map<string, ProfileCoin>();
  let done = 0;
  let hits = 0;

  for (const addr of coinAddresses) {
    const lower = addr.toLowerCase();
    const cacheFile = path.join(CACHE_ZORA_COINS, `${lower}.json`);
    const cached = await readJson<ProfileCoin | { notFound: true }>(cacheFile);
    if (cached) {
      if ("notFound" in cached) {
        // skip
      } else {
        map.set(lower, cached);
        hits++;
      }
      done++;
      continue;
    }

    try {
      const response = await withRetry(`zora getCoin ${lower}`, () =>
        getCoin({ address: lower, chain: 8453 }),
      );
      const node = (response?.data as { zora20Token?: unknown } | undefined)?.zora20Token;
      const mapped = mapCoinNode(node);
      if (mapped) {
        map.set(lower, mapped);
        await writeJson(cacheFile, mapped);
        hits++;
      } else {
        await writeJson(cacheFile, { notFound: true });
      }
    } catch (err) {
      warn(`zora getCoin ${lower}`, err);
      // Don't cache failures — let next run retry.
    }
    done++;
    if (done % 25 === 0 || done === coinAddresses.length) {
      log(`contentCoins: ${done}/${coinAddresses.length} (hits: ${hits})`);
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Stage 4a: Farcaster (Neynar bulk-by-address)
// ---------------------------------------------------------------------------

interface NeynarUser {
  fid: number;
  username: string;
  display_name?: string;
  follower_count?: number;
  profile?: { bio?: { text?: string } };
  custody_address?: string;
  verified_addresses?: { eth_addresses?: string[] };
  verified_accounts?: Array<{ platform?: string; username?: string }>;
}

async function fetchFarcasterByAddress(
  addresses: string[],
): Promise<Map<string, FarcasterRecord>> {
  const map = new Map<string, FarcasterRecord>();
  const cached = await readJson<Record<string, FarcasterRecord>>(CACHE_FARCASTER);
  if (cached) {
    for (const [k, v] of Object.entries(cached)) map.set(k.toLowerCase(), v);
  }
  if (!NEYNAR_API_KEY) {
    warn("Farcaster: NEYNAR_API_KEY not set, skipping enrichment");
    return map;
  }

  const todo = addresses.map((a) => a.toLowerCase()).filter((a) => !map.has(a));
  if (todo.length === 0) {
    log(`farcaster: ${map.size} cached, none to fetch`);
    return map;
  }

  log(`farcaster: fetching ${todo.length} (cached: ${map.size})`);
  const CHUNK_SIZE = 350;
  for (let i = 0; i < todo.length; i += CHUNK_SIZE) {
    const chunk = todo.slice(i, i + CHUNK_SIZE);
    try {
      const url = new URL("https://api.neynar.com/v2/farcaster/user/bulk-by-address");
      url.searchParams.set("addresses", chunk.join(","));
      url.searchParams.set("address_types", "custody_address,verified_address");
      const res = await fetch(url.toString(), { headers: { api_key: NEYNAR_API_KEY } });
      if (!res.ok) {
        warn(`Neynar chunk ${i}: ${res.status} ${await res.text().catch(() => "")}`);
        continue;
      }
      const json = (await res.json()) as Record<string, NeynarUser[]>;
      for (const addr of chunk) {
        const users = json[addr] ?? [];
        if (users.length === 0) continue;
        const user =
          users.find((u) => u.custody_address?.toLowerCase() === addr) ??
          users.find((u) =>
            (u.verified_addresses?.eth_addresses ?? []).some((a) => a.toLowerCase() === addr),
          ) ??
          users.sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0))[0];
        if (!user) continue;

        const twitterAccount = user.verified_accounts?.find(
          (a) =>
            a.platform?.toLowerCase() === "x" || a.platform?.toLowerCase() === "twitter",
        );

        map.set(addr, {
          username: user.username,
          displayName: user.display_name ?? null,
          followerCount: user.follower_count ?? 0,
          bio: user.profile?.bio?.text ?? null,
          twitter: twitterAccount?.username ?? null,
        });
      }
    } catch (err) {
      warn(`Neynar chunk ${i}`, err);
    }
    await sleep(150);
  }

  // Persist combined map
  const obj: Record<string, FarcasterRecord> = {};
  for (const [k, v] of map.entries()) obj[k] = v;
  await writeJson(CACHE_FARCASTER, obj);
  return map;
}

// ---------------------------------------------------------------------------
// Stage 4b: ENS reverse lookup (mainnet via Alchemy)
// ---------------------------------------------------------------------------

async function fetchEnsNames(addresses: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const cached = await readJson<Record<string, string | null>>(CACHE_ENS);
  if (cached) {
    for (const [k, v] of Object.entries(cached)) map.set(k.toLowerCase(), v);
  }

  if (!ALCHEMY_API_KEY) {
    warn("ENS: ALCHEMY_API_KEY not set, skipping ENS resolution");
    return map;
  }

  const client = createPublicClient({
    chain: mainnet,
    transport: http(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
  });

  const todo = addresses.map((a) => a.toLowerCase()).filter((a) => !map.has(a));
  if (todo.length === 0) {
    log(`ens: ${map.size} cached, none to resolve`);
    return map;
  }

  log(`ens: resolving ${todo.length} (cached: ${map.size})`);
  const CONCURRENCY = 8;
  const queue = [...todo];
  let done = 0;

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const addr = queue.shift();
      if (!addr) break;
      if (!isAddress(addr as Address)) {
        map.set(addr, null);
        continue;
      }
      try {
        const name = await client.getEnsName({ address: addr as Address });
        map.set(addr, name ?? null);
      } catch (err) {
        warn(`ENS ${addr}`, err);
        map.set(addr, null);
      }
      done++;
      if (done % 50 === 0 || done === todo.length) {
        log(`ens: ${done}/${todo.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const obj: Record<string, string | null> = {};
  for (const [k, v] of map.entries()) obj[k] = v;
  await writeJson(CACHE_ENS, obj);
  return map;
}

// ---------------------------------------------------------------------------
// Stage 5: Aggregate + write CSVs
// ---------------------------------------------------------------------------

interface CoinRow {
  creatorAddress: string;
  creatorEns: string | null;
  creatorFarcaster: string | null;
  coin: ProfileCoin;
  pool: GeckoPool | null;
  isGnarsPaired: boolean;
  hasLiquidity: boolean;
  zoraUrl: string;
}

type BackingTier =
  | "tier_1_gnars" // is GNARS itself
  | "tier_2_member_creator_coin" // is a Gnars member's creator coin
  | "tier_3_paired_with_gnars" // content coin paired with GNARS directly
  | "tier_4_paired_with_member_creator" // content coin paired with a member creator coin
  | "skip";

interface MigrationCandidate {
  coinAddress: string;
  symbol: string;
  name: string;
  createdAt: string | null;
  creatorAddress: string | null;
  creatorIsMember: boolean;
  creatorEns: string | null;
  creatorFarcaster: string | null;
  creatorTwitter: string | null;
  backingTier: BackingTier;
  backingTokenAddress: string;
  backingTokenSymbol: string | null;
  bestPoolAddress: string;
  bestPoolUrl: string;
  bestPoolTvlUsd: number;
  totalTvlUsdAllPools: number;
  poolCount: number;
  volume24hUsd: number;
  marketCapUsd: number | null;
  holdersCount: number | null;
  zoraUrl: string;
  recommendedAction: "must_include" | "should_include" | "consider" | "skip";
}

function isRootToken(addr: string): boolean {
  return ROOT_TOKENS.has(addr.toLowerCase());
}

function buildCoinRows(
  members: MemberRow[],
  profileMap: Map<string, ProfileCoinsForMember>,
  poolMap: Map<string, GeckoPool | null>,
  ensMap: Map<string, string | null>,
  fcMap: Map<string, FarcasterRecord>,
): CoinRow[] {
  const rows: CoinRow[] = [];
  const seenCoins = new Set<string>(); // de-dupe in case a coin appears under multiple member profiles

  for (const m of members) {
    const profile = profileMap.get(m.owner);
    if (!profile || profile.coins.length === 0) continue;

    for (const coin of profile.coins) {
      // Only include coins where the member is the actual creator (Zora may surface coins
      // they hold/contributed to). When creatorAddress is missing, fall back to membership.
      const creatorAddr =
        coin.creatorAddress && isAddress(coin.creatorAddress as Address)
          ? coin.creatorAddress.toLowerCase()
          : m.owner;
      if (creatorAddr !== m.owner) continue;

      const dedupeKey = `${creatorAddr}:${coin.address}`;
      if (seenCoins.has(dedupeKey)) continue;
      seenCoins.add(dedupeKey);

      const pool = poolMap.get(coin.address.toLowerCase()) ?? null;
      const isGnarsPaired =
        coin.poolCurrencyAddress?.toLowerCase() === GNARS_CREATOR_COIN ||
        pool?.baseTokenAddress === GNARS_CREATOR_COIN ||
        pool?.quoteTokenAddress === GNARS_CREATOR_COIN ||
        false;

      rows.push({
        creatorAddress: creatorAddr,
        creatorEns: ensMap.get(creatorAddr) ?? null,
        creatorFarcaster: fcMap.get(creatorAddr)?.username ?? null,
        coin,
        pool,
        isGnarsPaired,
        hasLiquidity: !!pool && pool.reserveInUsd > 0,
        zoraUrl: `https://zora.co/coin/base:${coin.address}`,
      });
    }
  }

  // Sort: gnars-paired first, then by TVL desc, then by symbol
  rows.sort((a, b) => {
    if (a.isGnarsPaired !== b.isGnarsPaired) return a.isGnarsPaired ? -1 : 1;
    const at = a.pool?.reserveInUsd ?? 0;
    const bt = b.pool?.reserveInUsd ?? 0;
    if (at !== bt) return bt - at;
    return a.coin.symbol.localeCompare(b.coin.symbol);
  });

  return rows;
}

function buildCreatorAggregates(
  members: MemberRow[],
  profileMap: Map<string, ProfileCoinsForMember>,
  coinRows: CoinRow[],
  ensMap: Map<string, string | null>,
  fcMap: Map<string, FarcasterRecord>,
): CreatorAggregate[] {
  const memberByOwner = new Map(members.map((m) => [m.owner, m]));
  const byCreator = new Map<string, CoinRow[]>();
  for (const row of coinRows) {
    const list = byCreator.get(row.creatorAddress) ?? [];
    list.push(row);
    byCreator.set(row.creatorAddress, list);
  }

  const creators: CreatorAggregate[] = [];
  for (const [creatorAddr, coins] of byCreator.entries()) {
    if (coins.length === 0) continue;
    const member = memberByOwner.get(creatorAddr);
    const profile = profileMap.get(creatorAddr);
    const fc = fcMap.get(creatorAddr) ?? null;

    const totalTvl = coins.reduce((s, c) => s + (c.pool?.reserveInUsd ?? 0), 0);
    const gnarsTvl = coins
      .filter((c) => c.isGnarsPaired)
      .reduce((s, c) => s + (c.pool?.reserveInUsd ?? 0), 0);
    const withLiquidity = coins.filter((c) => c.hasLiquidity).length;
    const totalHolders = coins.reduce((s, c) => s + (c.coin.uniqueHolders ?? 0), 0);

    const top = [...coins].sort(
      (a, b) => (b.pool?.reserveInUsd ?? 0) - (a.pool?.reserveInUsd ?? 0),
    )[0];

    // A member's "creator coin" is paired with a root currency (ZORA/USDC/WETH).
    // Content coins they made are paired with their own creator coin.
    const creatorCoinRow = coins.find((c) => {
      const pool = c.pool;
      const currencyAddr = c.coin.poolCurrencyAddress?.toLowerCase();
      const baseAddr = pool?.baseTokenAddress?.toLowerCase();
      const quoteAddr = pool?.quoteTokenAddress?.toLowerCase();
      return (
        (currencyAddr && isRootToken(currencyAddr)) ||
        (baseAddr && isRootToken(baseAddr)) ||
        (quoteAddr && isRootToken(quoteAddr))
      );
    });

    const twitter =
      profile?.socials.twitter ?? fc?.twitter ?? coins[0]?.coin.zoraTwitter ?? null;
    const email = findEmail(fc?.bio, profile?.socials.twitter, profile?.socials.farcaster);

    creators.push({
      address: creatorAddr,
      ens: ensMap.get(creatorAddr) ?? null,
      farcaster: fc,
      twitter,
      email,
      daoTokenCount: member?.daoTokenCount ?? 0,
      delegate: member?.delegate ?? creatorAddr,
      coinsCount: coins.length,
      coinsWithLiquidity: withLiquidity,
      totalTvlUsd: totalTvl,
      gnarsPairedTvlUsd: gnarsTvl,
      topCoinSymbol: top?.coin.symbol ?? null,
      topCoinTvlUsd: top?.pool?.reserveInUsd ?? 0,
      totalHoldersAcrossCoins: totalHolders,
      creatorCoinAddress: creatorCoinRow?.coin.address ?? null,
      creatorCoinSymbol: creatorCoinRow?.coin.symbol ?? null,
      creatorCoinTvlUsd: creatorCoinRow?.pool?.reserveInUsd ?? 0,
    });
  }

  creators.sort((a, b) => {
    if (a.totalTvlUsd !== b.totalTvlUsd) return b.totalTvlUsd - a.totalTvlUsd;
    return b.coinsCount - a.coinsCount;
  });

  return creators;
}

/**
 * Walk the Gnars-backed pool graph (1 hop from GNARS, 1 hop from each member
 * creator coin) and produce a ranked migration deposit list for upgrader.co.
 *
 * Tiers:
 *  tier_1_gnars                     — GNARS itself (must include)
 *  tier_2_member_creator_coin       — a member's creator coin paired with a
 *                                     root currency or with GNARS
 *  tier_3_paired_with_gnars         — content coin whose pool is GNARS<>X
 *  tier_4_paired_with_member_creator— content coin paired with a member creator
 */
function buildMigrationCandidates(
  members: MemberRow[],
  profileMap: Map<string, ProfileCoinsForMember>,
  creators: CreatorAggregate[],
  poolMap: Map<string, GeckoPool | null>,
  backedPoolsMap: Map<string, BackedPoolEntry[]>,
  contentCoinMeta: Map<string, ProfileCoin>,
  ensMap: Map<string, string | null>,
  fcMap: Map<string, FarcasterRecord>,
): MigrationCandidate[] {
  // Helpers ----------------------------------------------------------------
  const memberOwners = new Set(members.map((m) => m.owner));
  const creatorCoinByCreator = new Map<string, string>(); // creator -> creator-coin addr
  for (const c of creators) {
    if (c.creatorCoinAddress) {
      creatorCoinByCreator.set(c.address, c.creatorCoinAddress.toLowerCase());
    }
  }
  const memberCreatorCoinSet = new Set<string>(creatorCoinByCreator.values());

  // Index Zora coin metadata we already know about, for quick lookup.
  const knownCoins = new Map<string, ProfileCoin>();
  for (const [, p] of profileMap.entries()) {
    for (const coin of p.coins) knownCoins.set(coin.address.toLowerCase(), coin);
  }
  for (const [addr, coin] of contentCoinMeta.entries()) {
    if (!knownCoins.has(addr)) knownCoins.set(addr, coin);
  }

  // Backing relationships: for every coin we encounter, which seeds (GNARS or
  // member creator coins) is it paired with, and via which pools?
  interface PoolRecord {
    seed: string;
    pool: BackedPoolEntry;
  }
  const poolsByCoin = new Map<string, PoolRecord[]>();
  for (const [seed, pools] of backedPoolsMap.entries()) {
    for (const pool of pools) {
      const list = poolsByCoin.get(pool.otherTokenAddress) ?? [];
      list.push({ seed, pool });
      poolsByCoin.set(pool.otherTokenAddress, list);
    }
  }

  function tierFromBacking(coinAddr: string): {
    tier: BackingTier;
    backingTokenAddress: string;
    backingTokenSymbol: string | null;
    pools: PoolRecord[];
  } {
    const lower = coinAddr.toLowerCase();
    if (lower === GNARS_ZORA_TOKEN) {
      return {
        tier: "tier_1_gnars",
        backingTokenAddress: GNARS_ZORA_TOKEN,
        backingTokenSymbol: "GNARS",
        pools: poolsByCoin.get(lower) ?? [],
      };
    }
    if (memberCreatorCoinSet.has(lower)) {
      const meta = knownCoins.get(lower);
      return {
        tier: "tier_2_member_creator_coin",
        backingTokenAddress: meta?.poolCurrencyAddress ?? "",
        backingTokenSymbol: meta?.poolCurrencyName ?? null,
        pools: poolsByCoin.get(lower) ?? [],
      };
    }
    const records = poolsByCoin.get(lower) ?? [];
    // Prefer pairing with GNARS over member-creator pairing for tagging.
    const gnarsPool = records.find((r) => r.seed === GNARS_ZORA_TOKEN);
    if (gnarsPool) {
      return {
        tier: "tier_3_paired_with_gnars",
        backingTokenAddress: GNARS_ZORA_TOKEN,
        backingTokenSymbol: "GNARS",
        pools: records,
      };
    }
    const memberCreatorPool = records.find((r) => memberCreatorCoinSet.has(r.seed));
    if (memberCreatorPool) {
      return {
        tier: "tier_4_paired_with_member_creator",
        backingTokenAddress: memberCreatorPool.seed,
        backingTokenSymbol:
          knownCoins.get(memberCreatorPool.seed)?.symbol ??
          memberCreatorPool.pool.baseSymbol ??
          memberCreatorPool.pool.quoteSymbol ??
          null,
        pools: records,
      };
    }
    return {
      tier: "skip",
      backingTokenAddress: "",
      backingTokenSymbol: null,
      pools: records,
    };
  }

  function recommendation(
    tier: BackingTier,
    bestPoolTvl: number,
    holders: number | null,
  ): MigrationCandidate["recommendedAction"] {
    if (tier === "tier_1_gnars" || tier === "tier_2_member_creator_coin") return "must_include";
    if (tier === "skip") return "skip";
    // Content coin thresholds — keep loose; we'll let humans cull.
    if (bestPoolTvl >= 1_000) return "should_include";
    if (bestPoolTvl >= 100 || (holders ?? 0) >= 25) return "consider";
    return "skip";
  }

  // Walk every coin we have a backing relationship for, plus GNARS and
  // every member creator coin (which may not appear in any seed's pool list).
  const allCandidateAddrs = new Set<string>([
    GNARS_ZORA_TOKEN,
    ...memberCreatorCoinSet,
    ...poolsByCoin.keys(),
  ]);

  const candidates: MigrationCandidate[] = [];
  for (const addr of allCandidateAddrs) {
    if (isRootToken(addr)) continue;
    const meta = knownCoins.get(addr);
    const { tier, backingTokenAddress, backingTokenSymbol, pools } = tierFromBacking(addr);
    if (tier === "skip" && !meta) continue; // skip unknown root-token noise

    const sortedPools = [...pools].sort((a, b) => b.pool.reserveInUsd - a.pool.reserveInUsd);
    const bestPool = sortedPools[0]?.pool;
    const totalTvl = sortedPools.reduce((s, r) => s + r.pool.reserveInUsd, 0);
    const v24 = sortedPools.reduce((s, r) => s + (r.pool.volume24h ?? 0), 0);

    const creatorAddr = meta?.creatorAddress ?? null;
    const creatorIsMember = !!creatorAddr && memberOwners.has(creatorAddr);
    const fc = creatorAddr ? fcMap.get(creatorAddr) ?? null : null;

    // Fall back to single-pool data from `poolMap` (member-created coins) when
    // we don't have a backed-pool record (e.g. tier_1 GNARS itself).
    const fallbackPool = poolMap.get(addr) ?? null;
    const finalPoolAddr = bestPool?.poolAddress ?? fallbackPool?.poolAddress ?? "";
    const finalPoolUrl =
      bestPool?.poolUrl ??
      (fallbackPool?.poolAddress
        ? `https://www.geckoterminal.com/base/pools/${fallbackPool.poolAddress}`
        : "");
    const finalBestTvl = bestPool?.reserveInUsd ?? fallbackPool?.reserveInUsd ?? 0;
    const finalTotalTvl = totalTvl > 0 ? totalTvl : finalBestTvl;
    const finalVolume24 = v24 || fallbackPool?.volume24h || 0;
    const marketCap = fallbackPool?.marketCap ?? null;

    const holders = meta?.uniqueHolders ?? null;
    const symbol = meta?.symbol || (addr === GNARS_ZORA_TOKEN ? "GNARS" : "");
    const name = meta?.name || (addr === GNARS_ZORA_TOKEN ? "Gnars" : "");

    candidates.push({
      coinAddress: addr,
      symbol,
      name,
      createdAt: meta?.createdAt ?? null,
      creatorAddress: creatorAddr,
      creatorIsMember,
      creatorEns: creatorAddr ? ensMap.get(creatorAddr) ?? null : null,
      creatorFarcaster: fc?.username ?? null,
      creatorTwitter: fc?.twitter ?? meta?.zoraTwitter ?? null,
      backingTier: tier,
      backingTokenAddress,
      backingTokenSymbol,
      bestPoolAddress: finalPoolAddr,
      bestPoolUrl: finalPoolUrl,
      bestPoolTvlUsd: finalBestTvl,
      totalTvlUsdAllPools: finalTotalTvl,
      poolCount: sortedPools.length || (fallbackPool ? 1 : 0),
      volume24hUsd: finalVolume24,
      marketCapUsd: marketCap,
      holdersCount: holders,
      zoraUrl: `https://zora.co/coin/base:${addr}`,
      recommendedAction: recommendation(tier, finalBestTvl, holders),
    });
  }

  // Order: tier asc, then TVL desc, then holders desc, then symbol asc.
  const tierOrder: Record<BackingTier, number> = {
    tier_1_gnars: 0,
    tier_2_member_creator_coin: 1,
    tier_3_paired_with_gnars: 2,
    tier_4_paired_with_member_creator: 3,
    skip: 9,
  };
  candidates.sort((a, b) => {
    const at = tierOrder[a.backingTier];
    const bt = tierOrder[b.backingTier];
    if (at !== bt) return at - bt;
    if (a.bestPoolTvlUsd !== b.bestPoolTvlUsd) return b.bestPoolTvlUsd - a.bestPoolTvlUsd;
    if ((a.holdersCount ?? 0) !== (b.holdersCount ?? 0))
      return (b.holdersCount ?? 0) - (a.holdersCount ?? 0);
    return a.symbol.localeCompare(b.symbol);
  });

  return candidates;
}

async function writeCsvs(
  coinRows: CoinRow[],
  creators: CreatorAggregate[],
  migration: MigrationCandidate[],
): Promise<{ creatorsFile: string; coinsFile: string; migrationFile: string }> {
  await ensureDir(OUTPUT_DIR);
  const stamp = timestampSuffix();
  const creatorsFile = path.join(OUTPUT_DIR, `creators-${stamp}.csv`);
  const coinsFile = path.join(OUTPUT_DIR, `coins-${stamp}.csv`);
  const migrationFile = path.join(OUTPUT_DIR, `migration-candidates-${stamp}.csv`);

  await writeCsv(
    creatorsFile,
    [
      "creator_address",
      "creator_ens",
      "creator_farcaster",
      "creator_twitter",
      "creator_email",
      "creator_gnars_held",
      "creator_delegate",
      "coins_count",
      "coins_with_liquidity",
      "total_tvl_usd",
      "gnars_paired_tvl_usd",
      "top_coin_symbol",
      "top_coin_tvl_usd",
      "creator_coin_address",
      "creator_coin_symbol",
      "creator_coin_tvl_usd",
      "total_holders_across_coins",
      "migration_priority_tier",
    ],
    creators.map((c) => [
      c.address,
      c.ens ?? "",
      c.farcaster?.username ?? "",
      c.twitter ?? "",
      c.email ?? "",
      c.daoTokenCount,
      c.delegate,
      c.coinsCount,
      c.coinsWithLiquidity,
      c.totalTvlUsd.toFixed(2),
      c.gnarsPairedTvlUsd.toFixed(2),
      c.topCoinSymbol ?? "",
      c.topCoinTvlUsd.toFixed(2),
      c.creatorCoinAddress ?? "",
      c.creatorCoinSymbol ?? "",
      c.creatorCoinTvlUsd.toFixed(2),
      c.totalHoldersAcrossCoins,
      tierFor(c.totalTvlUsd),
    ]),
  );

  await writeCsv(
    coinsFile,
    [
      "creator_address",
      "creator_ens",
      "creator_farcaster",
      "coin_address",
      "coin_name",
      "coin_symbol",
      "coin_created_at",
      "is_gnars_paired",
      "has_liquidity",
      "pool_address",
      "pool_url",
      "backing_currency_symbol",
      "backing_currency_address",
      "pool_tvl_usd",
      "base_reserve_usd",
      "quote_reserve_usd",
      "market_cap_usd",
      "volume_24h_usd",
      "total_volume_usd",
      "price_usd",
      "holders_count",
      "fee_bps",
      "dex",
      "zora_url",
    ],
    coinRows.map((r) => [
      r.creatorAddress,
      r.creatorEns ?? "",
      r.creatorFarcaster ?? "",
      r.coin.address,
      r.coin.name,
      r.coin.symbol,
      r.coin.createdAt ?? "",
      r.isGnarsPaired ? "true" : "false",
      r.hasLiquidity ? "true" : "false",
      r.pool?.poolAddress ?? "",
      r.pool?.poolUrl ?? "",
      r.coin.poolCurrencyName ?? r.pool?.quoteSymbol ?? "",
      r.coin.poolCurrencyAddress ?? r.pool?.quoteTokenAddress ?? "",
      (r.pool?.reserveInUsd ?? 0).toFixed(2),
      r.pool?.baseReserveUsd?.toFixed(2) ?? "",
      r.pool?.quoteReserveUsd?.toFixed(2) ?? "",
      r.pool?.marketCap?.toFixed(2) ?? r.coin.marketCap ?? "",
      r.pool?.volume24h?.toFixed(2) ?? r.coin.volume24h ?? "",
      r.coin.totalVolume ?? "",
      r.coin.priceInUsdc ?? "",
      r.coin.uniqueHolders ?? "",
      r.pool?.feeBps ?? "",
      r.pool?.dex ?? "",
      r.zoraUrl,
    ]),
  );

  await writeCsv(
    migrationFile,
    [
      "rank",
      "backing_tier",
      "recommended_action",
      "coin_address",
      "coin_symbol",
      "coin_name",
      "creator_address",
      "creator_is_member",
      "creator_ens",
      "creator_farcaster",
      "creator_twitter",
      "backing_token_address",
      "backing_token_symbol",
      "best_pool_address",
      "best_pool_url",
      "best_pool_tvl_usd",
      "total_tvl_all_pools_usd",
      "pool_count",
      "volume_24h_usd",
      "market_cap_usd",
      "holders_count",
      "created_at",
      "zora_url",
    ],
    migration.map((m, i) => [
      i + 1,
      m.backingTier,
      m.recommendedAction,
      m.coinAddress,
      m.symbol,
      m.name,
      m.creatorAddress ?? "",
      m.creatorIsMember ? "true" : "false",
      m.creatorEns ?? "",
      m.creatorFarcaster ?? "",
      m.creatorTwitter ?? "",
      m.backingTokenAddress,
      m.backingTokenSymbol ?? "",
      m.bestPoolAddress,
      m.bestPoolUrl,
      m.bestPoolTvlUsd.toFixed(2),
      m.totalTvlUsdAllPools.toFixed(2),
      m.poolCount,
      m.volume24hUsd.toFixed(2),
      m.marketCapUsd != null ? m.marketCapUsd.toFixed(2) : "",
      m.holdersCount ?? "",
      m.createdAt ?? "",
      m.zoraUrl,
    ]),
  );

  return { creatorsFile, coinsFile, migrationFile };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await ensureDir(OUTPUT_DIR);
  await ensureDir(CACHE_DIR);

  const startedAt = Date.now();
  log(`DAO token: ${DAO_TOKEN_ADDRESS}`);
  log(`Zora API key: ${ZORA_API_KEY ? "yes" : "no (rate-limited)"}`);
  log(`Neynar key: ${NEYNAR_API_KEY ? "yes" : "no (skip Farcaster)"}`);
  log(`Alchemy key: ${ALCHEMY_API_KEY ? "yes" : "no (skip ENS)"}`);
  log(`Gecko key: ${GECKO_API_KEY ? "paid" : "free tier (~30 req/min)"}`);

  // 1. Members
  let members = await fetchAllMembers();
  if (members.length === 0) {
    log("no members found, aborting");
    return;
  }

  const limit = Number(process.env.LIMIT ?? 0);
  if (limit > 0 && limit < members.length) {
    log(`LIMIT=${limit} — truncating member list (full set: ${members.length})`);
    members = members.slice(0, limit);
  }

  // 2. Profile coins
  log(`profileCoins: starting for ${members.length} members…`);
  const profileMap = await fetchAllProfileCoins(members);

  // Collect unique coin addresses for pool lookup
  const allCoinAddresses = new Set<string>();
  let creatorsWithCoins = 0;
  for (const [, p] of profileMap.entries()) {
    if (p.coins.length > 0) creatorsWithCoins++;
    for (const c of p.coins) allCoinAddresses.add(c.address.toLowerCase());
  }
  log(`profileCoins: ${creatorsWithCoins} creators, ${allCoinAddresses.size} unique coins`);

  // 3. GeckoTerminal pools (best pool per member-created coin)
  const coinList = [...allCoinAddresses];
  const poolMap = await fetchAllPools(coinList);

  // 4. Backed-pool walk: for GNARS + every member-created coin, enumerate ALL
  //    pools containing them. The "other side" of those pools is the set of
  //    downstream content coins we care about for migration.
  const seedSet = new Set<string>([GNARS_ZORA_TOKEN, ...allCoinAddresses]);
  const seedList = [...seedSet];
  log(`backedPools: walking ${seedList.length} seeds (gnars + member-created coins)`);
  const backedPoolsMap = await fetchAllBackedPools(seedList);

  // Collect downstream coin addresses (the "other side" of every backed pool).
  const downstreamAddrs = new Set<string>();
  for (const [, pools] of backedPoolsMap.entries()) {
    for (const p of pools) {
      const other = p.otherTokenAddress.toLowerCase();
      if (!isRootToken(other) && !allCoinAddresses.has(other) && other !== GNARS_ZORA_TOKEN) {
        downstreamAddrs.add(other);
      }
    }
  }
  log(`backedPools: ${downstreamAddrs.size} new downstream coins to enrich`);

  // 5. Zora metadata for downstream coins (so we know symbol/creator/holders)
  const contentCoinMeta = await fetchContentCoinMetadata([...downstreamAddrs]);

  // 6. ENS + Farcaster — include member creators AND downstream coin creators.
  const enrichmentAddrs = new Set<string>(
    members
      .filter((m) => (profileMap.get(m.owner)?.coins?.length ?? 0) > 0)
      .map((m) => m.owner),
  );
  for (const meta of contentCoinMeta.values()) {
    if (meta.creatorAddress) enrichmentAddrs.add(meta.creatorAddress.toLowerCase());
  }
  const [ensMap, fcMap] = await Promise.all([
    fetchEnsNames([...enrichmentAddrs]),
    fetchFarcasterByAddress([...enrichmentAddrs]),
  ]);

  // 7. Aggregate + write
  const coinRows = buildCoinRows(members, profileMap, poolMap, ensMap, fcMap);
  const creators = buildCreatorAggregates(members, profileMap, coinRows, ensMap, fcMap);
  const migration = buildMigrationCandidates(
    members,
    profileMap,
    creators,
    poolMap,
    backedPoolsMap,
    contentCoinMeta,
    ensMap,
    fcMap,
  );
  const { creatorsFile, coinsFile, migrationFile } = await writeCsvs(
    coinRows,
    creators,
    migration,
  );

  const totalTvl = creators.reduce((s, c) => s + c.totalTvlUsd, 0);
  const gnarsTvl = creators.reduce((s, c) => s + c.gnarsPairedTvlUsd, 0);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  const tierCounts = migration.reduce<Record<BackingTier, number>>(
    (acc, m) => {
      acc[m.backingTier] = (acc[m.backingTier] ?? 0) + 1;
      return acc;
    },
    {
      tier_1_gnars: 0,
      tier_2_member_creator_coin: 0,
      tier_3_paired_with_gnars: 0,
      tier_4_paired_with_member_creator: 0,
      skip: 0,
    },
  );
  const mustInclude = migration.filter((m) => m.recommendedAction === "must_include").length;
  const shouldInclude = migration.filter((m) => m.recommendedAction === "should_include").length;
  const consider = migration.filter((m) => m.recommendedAction === "consider").length;

  log("=".repeat(60));
  log(`done in ${elapsed}s`);
  log(`creators with coins: ${creators.length}`);
  log(`coin rows: ${coinRows.length}`);
  log(`total TVL across all coins: $${totalTvl.toFixed(2)}`);
  log(`gnars-paired TVL: $${gnarsTvl.toFixed(2)}`);
  log(
    `migration candidates by tier: t1=${tierCounts.tier_1_gnars} t2=${tierCounts.tier_2_member_creator_coin} t3=${tierCounts.tier_3_paired_with_gnars} t4=${tierCounts.tier_4_paired_with_member_creator}`,
  );
  log(`migration recs: must=${mustInclude} should=${shouldInclude} consider=${consider}`);
  log(`creators CSV: ${path.relative(ROOT, creatorsFile)}`);
  log(`coins CSV:    ${path.relative(ROOT, coinsFile)}`);
  log(`migration CSV: ${path.relative(ROOT, migrationFile)}`);
}

// Persist partial output on Ctrl+C: nothing fancy needed because every stage
// writes its cache as it goes; rerunning resumes from the last completed step.
process.on("SIGINT", () => {
  log("interrupted — caches preserved, rerun to resume");
  process.exit(130);
});

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
