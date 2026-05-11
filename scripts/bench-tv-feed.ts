/**
 * Benchmark: Gnars TV Feed API Route
 *
 * Hits /api/tv/feed and measures:
 * - Cold start latency (first request)
 * - Warm latency (subsequent requests, edge-cached)
 * - Response size (bytes)
 * - Item counts per source
 * - Server-reported duration
 *
 * Run with: npx tsx scripts/bench-tv-feed.ts [--runs N] [--base-url URL] [--output FILE]
 *
 * Default: 3 runs against http://localhost:3000
 * Results saved to scripts/bench-results/feed-YYYY-MM-DDTHH-MM-SS.json
 */

import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const args = process.argv.slice(2);

function getArg(flag: string, defaultVal: string): string {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const RUNS = parseInt(getArg("--runs", "3"), 10);
const BASE_URL = getArg("--base-url", "http://localhost:3000");
const RESULTS_DIR = resolve(__dirname, "bench-results");

interface FeedResponse {
  items: Array<{
    id: string;
    videoUrl?: string;
    imageUrl?: string;
    coinAddress?: string;
    isDroposal?: boolean;
    farcasterFid?: number;
  }>;
  stats: {
    total: number;
    withVideo: number;
    withImage: number;
    gnarsPaired: number;
    droposals: number;
    creatorsCount: number;
    farcasterItems?: number;
  };
  fetchedAt: string;
  durationMs: number;
}

interface RunResult {
  run: number;
  latencyMs: number;
  serverDurationMs: number;
  responseSizeBytes: number;
  ttfbMs: number;
  status: number;
  error?: string;
}

interface BenchResult {
  timestamp: string;
  baseUrl: string;
  runs: number;
  results: RunResult[];
  summary: {
    coldLatencyMs: number;
    warmLatencyAvgMs: number;
    serverDurationMs: number;
    responseSizeBytes: number;
    ttfbColdMs: number;
    ttfbWarmAvgMs: number;
  };
  feed: {
    totalItems: number;
    withVideo: number;
    withImage: number;
    gnarsPaired: number;
    droposals: number;
    creatorsCount: number;
    farcasterItems: number;
  } | null;
}

async function fetchWithTiming(url: string): Promise<{
  latencyMs: number;
  ttfbMs: number;
  status: number;
  body: string;
  responseSizeBytes: number;
}> {
  const start = performance.now();
  let ttfbMs = 0;

  const response = await fetch(url, {
    headers: { "Cache-Control": "no-cache" },
  });

  ttfbMs = performance.now() - start;
  const body = await response.text();
  const latencyMs = performance.now() - start;

  return {
    latencyMs: Math.round(latencyMs),
    ttfbMs: Math.round(ttfbMs),
    status: response.status,
    body,
    responseSizeBytes: new TextEncoder().encode(body).length,
  };
}

async function runBenchmark(): Promise<BenchResult> {
  const timestamp = new Date().toISOString();
  const url = `${BASE_URL}/api/tv/feed`;
  const results: RunResult[] = [];
  let feedData: FeedResponse | null = null;

  console.log(`\n🔬 Gnars TV Feed Benchmark`);
  console.log(`   URL: ${url}`);
  console.log(`   Runs: ${RUNS}\n`);

  for (let i = 0; i < RUNS; i++) {
    const label = i === 0 ? "COLD" : `WARM #${i}`;
    process.stdout.write(`   [${label}] Fetching...`);

    try {
      const result = await fetchWithTiming(url);

      results.push({
        run: i + 1,
        latencyMs: result.latencyMs,
        ttfbMs: result.ttfbMs,
        status: result.status,
        responseSizeBytes: result.responseSizeBytes,
        serverDurationMs: 0,
      });

      if (result.status === 200) {
        try {
          const data = JSON.parse(result.body) as FeedResponse;
          results[i].serverDurationMs = data.durationMs || 0;
          if (i === 0) feedData = data;
        } catch {
          // Non-JSON response
        }
      }

      console.log(
        ` ${result.latencyMs}ms (TTFB: ${result.ttfbMs}ms, server: ${results[i].serverDurationMs}ms, ${(result.responseSizeBytes / 1024).toFixed(1)}KB)`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        run: i + 1,
        latencyMs: -1,
        ttfbMs: -1,
        status: 0,
        responseSizeBytes: 0,
        serverDurationMs: 0,
        error: msg,
      });
      console.log(` ERROR: ${msg}`);
    }

    // Small delay between runs to let edge cache settle
    if (i < RUNS - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const successResults = results.filter((r) => r.status === 200);
  const coldResult = successResults[0];
  const warmResults = successResults.slice(1);

  const summary = {
    coldLatencyMs: coldResult?.latencyMs ?? -1,
    warmLatencyAvgMs: warmResults.length
      ? Math.round(warmResults.reduce((s, r) => s + r.latencyMs, 0) / warmResults.length)
      : -1,
    serverDurationMs: coldResult?.serverDurationMs ?? -1,
    responseSizeBytes: coldResult?.responseSizeBytes ?? 0,
    ttfbColdMs: coldResult?.ttfbMs ?? -1,
    ttfbWarmAvgMs: warmResults.length
      ? Math.round(warmResults.reduce((s, r) => s + r.ttfbMs, 0) / warmResults.length)
      : -1,
  };

  const feed = feedData
    ? {
        totalItems: feedData.stats.total,
        withVideo: feedData.stats.withVideo,
        withImage: feedData.stats.withImage,
        gnarsPaired: feedData.stats.gnarsPaired,
        droposals: feedData.stats.droposals,
        creatorsCount: feedData.stats.creatorsCount,
        farcasterItems: feedData.stats.farcasterItems ?? 0,
      }
    : null;

  console.log(`\n   📊 Summary:`);
  console.log(`      Cold:  ${summary.coldLatencyMs}ms (TTFB: ${summary.ttfbColdMs}ms)`);
  console.log(`      Warm:  ${summary.warmLatencyAvgMs}ms avg (TTFB: ${summary.ttfbWarmAvgMs}ms)`);
  console.log(`      Server duration: ${summary.serverDurationMs}ms`);
  console.log(`      Response: ${(summary.responseSizeBytes / 1024).toFixed(1)}KB`);
  if (feed) {
    console.log(
      `      Items: ${feed.totalItems} (${feed.withVideo} video, ${feed.withImage} image)`,
    );
    console.log(
      `      Sources: ${feed.gnarsPaired} paired, ${feed.droposals} droposals, ${feed.farcasterItems} farcaster`,
    );
    console.log(`      Creators: ${feed.creatorsCount}`);
  }

  return { timestamp, baseUrl: BASE_URL, runs: RUNS, results, summary, feed };
}

async function main() {
  const result = await runBenchmark();

  mkdirSync(RESULTS_DIR, { recursive: true });
  const filename = `feed-${result.timestamp.replace(/[:.]/g, "-")}.json`;
  const outputPath = getArg("--output", resolve(RESULTS_DIR, filename));
  writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n   💾 Saved to: ${outputPath}\n`);
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
