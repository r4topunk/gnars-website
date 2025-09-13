import { NextResponse } from "next/server";
import { BASE_URL } from "@/lib/config";

// Lightweight monthly treasury performance endpoint
// - Returns one datapoint per month (including current month up to now)
// - Uses BaseScan to map timestamps to blocks, then Base RPC to read balances

type MonthlyPoint = {
  month: string;
  timestamp: number;
  block: number;
  ethWei: string;
  eth: number;
  usdcRaw: string;
  usdc: number;
};

const BASE_RPC = process.env.BASE_RPC || "https://mainnet.base.org"; // fallback only
const BASESCAN_API = "https://api.basescan.org/api";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";
const USDC_BASE = (process.env.USDC_BASE || "0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913").toLowerCase();

// Gnars treasury by default; override with ?address=
const DEFAULT_TREASURY = "0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88".toLowerCase();

function monthEndsUtc(nMonths: number, anchor?: Date): Date[] {
  const now = anchor ? new Date(anchor) : new Date();
  // Normalize to second precision in UTC
  const utc = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
    ),
  );

  const pointsDesc: Date[] = [utc];
  let year = utc.getUTCFullYear();
  let month = utc.getUTCMonth();
  for (let i = 0; i < Math.max(0, nMonths - 1); i++) {
    const firstOfCurrent = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const lastPrev = new Date(firstOfCurrent.getTime() - 1000);
    pointsDesc.push(lastPrev);
    year = lastPrev.getUTCFullYear();
    month = lastPrev.getUTCMonth();
  }
  return pointsDesc.reverse();
}

// simple in-process cache for timestamp->block with soft TTL
const blockByTimestampCache = new Map<number, { block: number; cachedAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
let lastBasescanCallAt = 0; // for naive rate limiting (2 req/sec)

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function basescanBlockByTimestamp(ts: number): Promise<number> {
  const existing = blockByTimestampCache.get(ts);
  if (existing && Date.now() - existing.cachedAt < CACHE_TTL_MS) {
    return existing.block;
  }

  // throttle: ensure spacing between requests to respect 2/sec
  const elapsed = Date.now() - lastBasescanCallAt;
  if (elapsed < 600) {
    await sleep(600 - elapsed);
  }
  const url = new URL(BASESCAN_API);
  url.searchParams.set("module", "block");
  url.searchParams.set("action", "getblocknobytime");
  url.searchParams.set("timestamp", String(ts));
  url.searchParams.set("closest", "before");
  if (BASESCAN_API_KEY) url.searchParams.set("apikey", BASESCAN_API_KEY);

  lastBasescanCallAt = Date.now();
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`basescan http ${res.status}`);
  const j = (await res.json()) as { status?: string; result?: string };
  if (j?.result) {
    const n = Number(j.result);
    if (Number.isFinite(n)) {
      blockByTimestampCache.set(ts, { block: n, cachedAt: Date.now() });
      return n;
    }
  }
  throw new Error(`basescan response: ${JSON.stringify(j)}`);
}

let lastRpcCallAt = 0;
async function rpcCall<T = unknown>(method: string, params: unknown[]): Promise<T> {
  // throttle RPC to be gentle with provider
  const elapsed = Date.now() - lastRpcCallAt;
  if (elapsed < 150) await sleep(150 - elapsed);
  lastRpcCallAt = Date.now();

  const alchemyUrl = `${BASE_URL}/api/alchemy`;
  const body = { method, params };

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    const res = await fetch(alchemyUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (res.ok) {
      const j = (await res.json()) as { result?: T; error?: unknown };
      if ((j as { error?: unknown }).error) throw new Error(`rpc error ${JSON.stringify(j)}`);
      return j.result as T;
    }
    // fallback once directly to BASE_RPC if alchemy route fails unexpectedly
    if (attempt === 1) {
      const direct = await fetch(BASE_RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        cache: "no-store",
      });
      if (direct.ok) {
        const j = (await direct.json()) as { result?: T; error?: unknown };
        if ((j as { error?: unknown }).error) throw new Error(`rpc error ${JSON.stringify(j)}`);
        return j.result as T;
      }
    }
    if (res.status === 429 && attempt < 4) {
      await sleep(300 * attempt); // backoff
      continue;
    }
    throw new Error(`rpc http ${res.status}`);
  }
}

async function ethGetBalanceAtBlock(address: string, blockNumber: number): Promise<bigint> {
  const blockHex = `0x${blockNumber.toString(16)}`;
  const result = await rpcCall<string>("eth_getBalance", [address, blockHex]);
  return BigInt(result);
}

async function erc20BalanceOfAtBlock(token: string, holder: string, blockNumber: number): Promise<bigint> {
  const selector = "70a08231"; // balanceOf(address)
  const addr = holder.toLowerCase().replace("0x", "").padStart(40, "0");
  const data = `0x${selector}${"0".repeat(24)}${addr}`;
  const call = { to: token, data } as const;
  const blockHex = `0x${blockNumber.toString(16)}`;
  const result = await rpcCall<string>("eth_call", [call, blockHex]);
  return BigInt(result);
}

function formatUnits(amount: bigint, decimals: number): number {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const frac = amount % divisor;
  // Keep up to 6 decimal places for readability
  const fracStr = (Number(frac) / Number(divisor)).toFixed(6).slice(1);
  return Number(`${whole}${fracStr}`);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = (searchParams.get("address") || DEFAULT_TREASURY).toLowerCase();
    const months = Math.max(1, Math.min(24, Number(searchParams.get("months") || 6)));

    const points = monthEndsUtc(months);
    const timestamps = points.map((d) => Math.floor(d.getTime() / 1000));

    // Resolve blocks sequentially (rate-limit friendly)
    const blocks: number[] = [];
    for (const ts of timestamps) {
      // retry up to 3 times if rate-limited
      let attempt = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const b = await basescanBlockByTimestamp(ts);
          blocks.push(b);
          break;
        } catch (e) {
          attempt += 1;
          if (attempt >= 3) throw e;
          // backoff before retry
          await sleep(800);
        }
      }
    }

    const results: MonthlyPoint[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const ts = timestamps[i];

      const [ethWei, usdcRaw] = await Promise.all([
        ethGetBalanceAtBlock(address, block),
        erc20BalanceOfAtBlock(USDC_BASE, address, block),
      ]);

      const dt = points[i];
      results.push({
        month: `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`,
        timestamp: ts,
        block,
        ethWei: ethWei.toString(),
        eth: formatUnits(ethWei, 18),
        usdcRaw: usdcRaw.toString(),
        usdc: formatUnits(usdcRaw, 6),
      });
    }

    return NextResponse.json({ address, months, points: results }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}


