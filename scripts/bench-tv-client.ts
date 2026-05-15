/**
 * Benchmark: Gnars TV Client Flow
 *
 * Simulates what the browser does when loading /tv or /tv/[coinAddress]:
 * 1. (Optional) Fetch priority coin via Zora SDK
 * 2. Fetch /api/tv/feed
 * 3. Measure total time-to-data
 *
 * Also measures the overhead of sequential vs parallel fetching
 * to validate Fix #3 (priority coin Promise.all).
 *
 * Run with: npx tsx scripts/bench-tv-client.ts [--coin ADDRESS] [--base-url URL]
 *
 * Results saved to scripts/bench-results/client-YYYY-MM-DDTHH-MM-SS.json
 */

import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const args = process.argv.slice(2);

function getArg(flag: string, defaultVal: string): string {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const BASE_URL = getArg("--base-url", "http://localhost:3000");
const COIN_ADDRESS = getArg("--coin", "");
const RESULTS_DIR = resolve(__dirname, "bench-results");

interface TimingResult {
  label: string;
  latencyMs: number;
  status: number;
  error?: string;
}

async function timedFetch(
  label: string,
  url: string,
  options?: RequestInit,
): Promise<TimingResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const latencyMs = Math.round(performance.now() - start);
    // Consume body to measure full transfer time
    await res.text();
    const fullLatency = Math.round(performance.now() - start);
    return { label, latencyMs: fullLatency, status: res.status };
  } catch (err) {
    return {
      label,
      latencyMs: Math.round(performance.now() - start),
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

interface ClientBenchResult {
  timestamp: string;
  baseUrl: string;
  coinAddress: string | null;
  scenarios: {
    feedOnly: {
      totalMs: number;
      feedMs: number;
    };
    sequential: {
      totalMs: number;
      coinMs: number;
      feedMs: number;
    } | null;
    parallel: {
      totalMs: number;
      coinMs: number;
      feedMs: number;
    } | null;
    improvement: {
      sequentialMs: number;
      parallelMs: number;
      savedMs: number;
      savedPct: string;
    } | null;
  };
  details: TimingResult[];
}

async function runBenchmark(): Promise<ClientBenchResult> {
  const timestamp = new Date().toISOString();
  const feedUrl = `${BASE_URL}/api/tv/feed`;
  const details: TimingResult[] = [];

  console.log(`\n🖥️  Gnars TV Client Flow Benchmark`);
  console.log(`   Feed URL: ${feedUrl}`);
  if (COIN_ADDRESS) console.log(`   Priority coin: ${COIN_ADDRESS}`);
  console.log();

  // Scenario 1: Feed only (no priority coin)
  console.log("   [1/3] Feed only...");
  const feedOnlyStart = performance.now();
  const feedOnly = await timedFetch("feed-only", feedUrl);
  const feedOnlyTotal = Math.round(performance.now() - feedOnlyStart);
  details.push(feedOnly);
  console.log(`         ${feedOnlyTotal}ms (status: ${feedOnly.status})`);

  // Wait for edge cache to stabilize
  await new Promise((r) => setTimeout(r, 1000));

  let sequential: ClientBenchResult["scenarios"]["sequential"] = null;
  let parallel: ClientBenchResult["scenarios"]["parallel"] = null;
  let improvement: ClientBenchResult["scenarios"]["improvement"] = null;

  if (COIN_ADDRESS) {
    // We can't call Zora SDK directly (it needs server env), so we use the
    // /api/tv/feed endpoint and simulate the coin fetch with a Zora API call
    const coinUrl = `https://api.zora.co/coins/${COIN_ADDRESS}?chain=base`;

    // Scenario 2: Sequential (current behavior - coin THEN feed)
    console.log("   [2/3] Sequential (coin → feed)...");
    const seqStart = performance.now();
    const seqCoin = await timedFetch("seq-coin", coinUrl);
    const seqFeed = await timedFetch("seq-feed", feedUrl);
    const seqTotal = Math.round(performance.now() - seqStart);
    details.push(seqCoin, seqFeed);
    sequential = {
      totalMs: seqTotal,
      coinMs: seqCoin.latencyMs,
      feedMs: seqFeed.latencyMs,
    };
    console.log(
      `         ${seqTotal}ms (coin: ${seqCoin.latencyMs}ms + feed: ${seqFeed.latencyMs}ms)`,
    );

    await new Promise((r) => setTimeout(r, 1000));

    // Scenario 3: Parallel (fixed behavior - coin AND feed)
    console.log("   [3/3] Parallel (coin || feed)...");
    const parStart = performance.now();
    const [parCoin, parFeed] = await Promise.all([
      timedFetch("par-coin", coinUrl),
      timedFetch("par-feed", feedUrl),
    ]);
    const parTotal = Math.round(performance.now() - parStart);
    details.push(parCoin, parFeed);
    parallel = {
      totalMs: parTotal,
      coinMs: parCoin.latencyMs,
      feedMs: parFeed.latencyMs,
    };
    console.log(
      `         ${parTotal}ms (coin: ${parCoin.latencyMs}ms || feed: ${parFeed.latencyMs}ms)`,
    );

    improvement = {
      sequentialMs: seqTotal,
      parallelMs: parTotal,
      savedMs: seqTotal - parTotal,
      savedPct: `${(((seqTotal - parTotal) / seqTotal) * 100).toFixed(1)}%`,
    };

    console.log(`\n   📊 Parallel saves: ${improvement.savedMs}ms (${improvement.savedPct})`);
  } else {
    console.log("   [2/3] Skipped (no --coin provided)");
    console.log("   [3/3] Skipped (no --coin provided)");
  }

  return {
    timestamp,
    baseUrl: BASE_URL,
    coinAddress: COIN_ADDRESS || null,
    scenarios: {
      feedOnly: { totalMs: feedOnlyTotal, feedMs: feedOnly.latencyMs },
      sequential,
      parallel,
      improvement,
    },
    details,
  };
}

async function main() {
  const result = await runBenchmark();

  mkdirSync(RESULTS_DIR, { recursive: true });
  const filename = `client-${result.timestamp.replace(/[:.]/g, "-")}.json`;
  const outputPath = resolve(RESULTS_DIR, filename);
  writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n   💾 Saved to: ${outputPath}\n`);
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
