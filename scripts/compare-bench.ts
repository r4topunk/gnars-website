/**
 * Compare two benchmark result files
 *
 * Usage:
 *   npx tsx scripts/compare-bench.ts <before.json> <after.json>
 *
 * Compares feed benchmarks or client benchmarks and shows improvement percentages.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const [beforePath, afterPath] = process.argv.slice(2);

if (!beforePath || !afterPath) {
  console.error("Usage: npx tsx scripts/compare-bench.ts <before.json> <after.json>");
  process.exit(1);
}

function loadJson(path: string): Record<string, unknown> {
  const resolved = resolve(process.cwd(), path);
  return JSON.parse(readFileSync(resolved, "utf-8"));
}

function delta(before: number, after: number): string {
  if (before <= 0 || after <= 0) return "N/A";
  const diff = after - before;
  const pct = ((diff / before) * 100).toFixed(1);
  const sign = diff > 0 ? "+" : "";
  const arrow = diff < 0 ? "✅" : diff > 0 ? "⚠️" : "➡️";
  return `${arrow} ${sign}${diff}ms (${sign}${pct}%)`;
}

function formatMs(ms: number): string {
  return ms >= 0 ? `${ms}ms` : "N/A";
}

function compareFeed(before: Record<string, unknown>, after: Record<string, unknown>) {
  const bSummary = before.summary as Record<string, number>;
  const aSummary = after.summary as Record<string, number>;
  const bFeed = before.feed as Record<string, number> | null;
  const aFeed = after.feed as Record<string, number> | null;

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║              GNARS TV FEED BENCHMARK COMPARISON             ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Before: ${(before.timestamp as string).slice(0, 19).padEnd(50)}║`);
  console.log(`║  After:  ${(after.timestamp as string).slice(0, 19).padEnd(50)}║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");

  const metrics = [
    ["Cold Latency", bSummary.coldLatencyMs, aSummary.coldLatencyMs],
    ["Warm Latency (avg)", bSummary.warmLatencyAvgMs, aSummary.warmLatencyAvgMs],
    ["Server Duration", bSummary.serverDurationMs, aSummary.serverDurationMs],
    ["TTFB Cold", bSummary.ttfbColdMs, aSummary.ttfbColdMs],
    ["TTFB Warm (avg)", bSummary.ttfbWarmAvgMs, aSummary.ttfbWarmAvgMs],
    [
      "Response Size (KB)",
      Math.round(bSummary.responseSizeBytes / 1024),
      Math.round(aSummary.responseSizeBytes / 1024),
    ],
  ] as const;

  console.log("║                                                              ║");
  console.log("║  LATENCY                                                     ║");
  console.log("║  ────────────────────────────────────────────────────         ║");

  for (const [label, bVal, aVal] of metrics) {
    const unit = label.includes("KB") ? "KB" : "ms";
    const bStr = bVal >= 0 ? `${bVal}${unit}` : "N/A";
    const aStr = aVal >= 0 ? `${aVal}${unit}` : "N/A";
    const change = label.includes("KB")
      ? delta(bVal as number, aVal as number).replace("ms", "KB")
      : delta(bVal as number, aVal as number);
    console.log(
      `║  ${label.padEnd(20)} ${bStr.padStart(8)} → ${aStr.padStart(8)}  ${change.padEnd(22)}║`,
    );
  }

  if (bFeed && aFeed) {
    console.log("║                                                              ║");
    console.log("║  FEED CONTENT                                                ║");
    console.log("║  ────────────────────────────────────────────────────         ║");

    const feedMetrics = [
      ["Total Items", bFeed.totalItems, aFeed.totalItems],
      ["Video", bFeed.withVideo, aFeed.withVideo],
      ["Image", bFeed.withImage, aFeed.withImage],
      ["GNARS Paired", bFeed.gnarsPaired, aFeed.gnarsPaired],
      ["Droposals", bFeed.droposals, aFeed.droposals],
      ["Farcaster", bFeed.farcasterItems, aFeed.farcasterItems],
      ["Creators", bFeed.creatorsCount, aFeed.creatorsCount],
    ] as const;

    for (const [label, bVal, aVal] of feedMetrics) {
      const changed = bVal !== aVal ? " ⚡" : "";
      console.log(
        `║  ${label.padEnd(20)} ${String(bVal).padStart(8)} → ${String(aVal).padStart(8)}${changed.padEnd(24)}║`,
      );
    }
  }

  console.log("║                                                              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function compareClient(before: Record<string, unknown>, after: Record<string, unknown>) {
  const bScenarios = before.scenarios as Record<string, Record<string, unknown>>;
  const aScenarios = after.scenarios as Record<string, Record<string, unknown>>;

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║            GNARS TV CLIENT FLOW BENCHMARK COMPARISON        ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Before: ${(before.timestamp as string).slice(0, 19).padEnd(50)}║`);
  console.log(`║  After:  ${(after.timestamp as string).slice(0, 19).padEnd(50)}║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");

  const bFeed = bScenarios.feedOnly as Record<string, number>;
  const aFeed = aScenarios.feedOnly as Record<string, number>;

  console.log("║                                                              ║");
  console.log("║  FEED ONLY                                                   ║");
  console.log("║  ────────────────────────────────────────────────────         ║");
  console.log(
    `║  Total              ${formatMs(bFeed.totalMs).padStart(8)} → ${formatMs(aFeed.totalMs).padStart(8)}  ${delta(bFeed.totalMs, aFeed.totalMs).padEnd(22)}║`,
  );

  const bSeq = bScenarios.sequential as Record<string, number> | null;
  const aSeq = aScenarios.sequential as Record<string, number> | null;
  const bPar = bScenarios.parallel as Record<string, number> | null;
  const aPar = aScenarios.parallel as Record<string, number> | null;

  if (bSeq && aSeq) {
    console.log("║                                                              ║");
    console.log("║  SEQUENTIAL (coin → feed)                                    ║");
    console.log("║  ────────────────────────────────────────────────────         ║");
    console.log(
      `║  Total              ${formatMs(bSeq.totalMs).padStart(8)} → ${formatMs(aSeq.totalMs).padStart(8)}  ${delta(bSeq.totalMs, aSeq.totalMs).padEnd(22)}║`,
    );
    console.log(
      `║  Coin               ${formatMs(bSeq.coinMs).padStart(8)} → ${formatMs(aSeq.coinMs).padStart(8)}  ${delta(bSeq.coinMs, aSeq.coinMs).padEnd(22)}║`,
    );
    console.log(
      `║  Feed               ${formatMs(bSeq.feedMs).padStart(8)} → ${formatMs(aSeq.feedMs).padStart(8)}  ${delta(bSeq.feedMs, aSeq.feedMs).padEnd(22)}║`,
    );
  }

  if (bPar && aPar) {
    console.log("║                                                              ║");
    console.log("║  PARALLEL (coin || feed)                                     ║");
    console.log("║  ────────────────────────────────────────────────────         ║");
    console.log(
      `║  Total              ${formatMs(bPar.totalMs).padStart(8)} → ${formatMs(aPar.totalMs).padStart(8)}  ${delta(bPar.totalMs, aPar.totalMs).padEnd(22)}║`,
    );
  }

  const bImprove = bScenarios.improvement as Record<string, unknown> | null;
  const aImprove = aScenarios.improvement as Record<string, unknown> | null;

  if (bImprove && aImprove) {
    console.log("║                                                              ║");
    console.log("║  PARALLEL IMPROVEMENT                                        ║");
    console.log("║  ────────────────────────────────────────────────────         ║");
    console.log(
      `║  Before: saved ${String(bImprove.savedMs).padStart(4)}ms (${String(bImprove.savedPct).padStart(5)})                              ║`,
    );
    console.log(
      `║  After:  saved ${String(aImprove.savedMs).padStart(4)}ms (${String(aImprove.savedPct).padStart(5)})                              ║`,
    );
  }

  console.log("║                                                              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function main() {
  const before = loadJson(beforePath);
  const after = loadJson(afterPath);

  // Detect type by checking for feed-specific or client-specific fields
  if ("summary" in before && "summary" in after) {
    compareFeed(before, after);
  } else if ("scenarios" in before && "scenarios" in after) {
    compareClient(before, after);
  } else {
    console.error(
      "Cannot determine benchmark type. Ensure both files are the same type (feed or client).",
    );
    process.exit(1);
  }
}

main();
