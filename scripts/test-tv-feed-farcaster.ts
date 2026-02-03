/**
 * Test script for Farcaster-enhanced TV feed.
 *
 * Run with: npx tsx scripts/test-tv-feed-farcaster.ts
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
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

async function testTvFeedFarcaster() {
  console.log("📺 Testing Farcaster-enhanced TV feed\n");
  console.log("=".repeat(60));

  const require = createRequire(import.meta.url);
  const Module = require("module");
  const shimPath = resolve(process.cwd(), "scripts", "shims");
  process.env.NODE_PATH = [shimPath, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
  Module._initPaths();

  const { GET } = await import("../src/app/api/tv/feed/route");
  const response = await GET();
  const data = (await response.json()) as {
    items?: Array<{
      id: string;
      title: string;
      creator: string;
      farcasterFid?: number;
      farcasterFollowerCount?: number;
      farcasterType?: string;
    }>;
    stats?: Record<string, number>;
    durationMs?: number;
  };

  const items = data.items ?? [];
  const stats = data.stats ?? {};

  console.log(`Feed items: ${items.length}`);
  console.log(`Farcaster items: ${stats.farcasterItems ?? 0}`);
  console.log(`Farcaster creators: ${stats.farcasterCreators ?? 0}`);
  console.log(`Farcaster coins: ${stats.farcasterCoins ?? 0}`);
  console.log(`Farcaster NFTs: ${stats.farcasterNfts ?? 0}`);
  console.log(`Duration: ${data.durationMs ?? 0}ms\n`);

  console.log("Top Farcaster items:");
  const farcasterItems = items.filter((item) => item.farcasterFid);
  for (const item of farcasterItems.slice(0, 10)) {
    console.log(
      `- [${item.farcasterType ?? "unknown"}] ${item.title} (fid ${item.farcasterFid}, followers ${item.farcasterFollowerCount ?? 0})`,
    );
  }

  console.log("\n" + "=".repeat(60));
}

testTvFeedFarcaster().catch((error) => {
  console.error(error);
  process.exit(1);
});
