/**
 * Test script for the Farcaster TV aggregator.
 *
 * Run with: npx tsx scripts/test-farcaster-tv-aggregator.ts
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createRequire } from "module";
import path from "path";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const contents = readFileSync(envPath, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

async function testFarcasterTvAggregator() {
  console.log("📺 Testing Farcaster TV aggregator\n");
  console.log("=".repeat(60));

  const require = createRequire(import.meta.url);
  const Module = require("module");
  const shimPath = resolve(process.cwd(), "scripts", "shims");
  process.env.NODE_PATH = [shimPath, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
  Module._initPaths();

  const { getFarcasterTVData } = await import("../src/services/farcaster-tv-aggregator");

  const runOnce = async (label: string) => {
    const start = Date.now();
    const data = await getFarcasterTVData();
    const elapsed = Date.now() - start;
    console.log(`${label}: ${elapsed}ms (cache: ${data.cache.source}, build: ${data.durationMs}ms)`);
    console.log(
      `  creators: ${data.qualifiedCreators.length}, items: ${data.items.length}, coins: ${data.stats.coins}, nfts: ${data.stats.nfts}`,
    );
  };

  await runOnce("Run 1");
  await runOnce("Run 2");

  console.log("=".repeat(60));
}

testFarcasterTvAggregator().catch((error) => {
  console.error(error);
  process.exit(1);
});
