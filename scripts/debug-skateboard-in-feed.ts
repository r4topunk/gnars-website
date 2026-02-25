/**
 * Debug why @skateboard (FID 20721) is missing from the Farcaster TV feed.
 *
 * Run with: npx tsx scripts/debug-skateboard-in-feed.ts
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createRequire } from "module";
import path from "path";

const TARGET_FID = 20721;
const GNARS_COIN_ADDRESS = "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b";
const MAX_FARCASTER_USERS = 40;

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
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function toNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

loadEnvLocal();

async function debugSkateboard() {
  console.log("🧪 Debugging Farcaster TV feed for @skateboard (FID 20721)\n");

  const require = createRequire(import.meta.url);
  const Module = require("module");
  const shimPath = resolve(process.cwd(), "scripts", "shims");
  process.env.NODE_PATH = [shimPath, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
  Module._initPaths();

  const { getFarcasterTVDataUncached } = await import(
    "../src/services/farcaster-tv-aggregator",
  );
  const {
    fetchFarcasterProfilesByAddressUncached,
    fetchFarcasterUserCoinsUncached,
  } = await import("../src/services/farcaster");

  console.log("1) Calling Farcaster TV aggregator...");
  const data = await getFarcasterTVDataUncached();
  console.log(`   qualifiedCreators: ${data.qualifiedCreators.length}`);
  console.log(
    `   items: ${data.items.length} (coins: ${data.stats.coins}, nfts: ${data.stats.nfts}, creators: ${data.stats.creators})`,
  );
  console.log(`   cache: ${data.cache.source}, build: ${data.durationMs}ms\n`);

  console.log("2) Checking if FID 20721 is represented in qualified creators...");
  const wallets = data.qualifiedCreators.flatMap((creator) => creator.wallets);
  const profilesByAddress = await fetchFarcasterProfilesByAddressUncached(wallets);

  const matchedCreators = data.qualifiedCreators
    .map((creator) => {
      const profiles = creator.wallets
        .map((wallet) => profilesByAddress[wallet.toLowerCase()])
        .filter(Boolean);
      if (profiles.length === 0) return null;
      const bestProfile = profiles.sort((a, b) => b.followerCount - a.followerCount)[0];
      return { creator, profile: bestProfile, profiles };
    })
    .filter(Boolean);

  const fidMatches = matchedCreators.filter((match) => match?.profile.fid === TARGET_FID);

  if (fidMatches.length === 0) {
    console.log("   ❌ No qualified creator maps to FID 20721 via wallet lookup.");
  } else {
    console.log(`   ✅ Found ${fidMatches.length} qualified creator(s) mapping to FID 20721:`);
    for (const match of fidMatches) {
      if (!match) continue;
      console.log(
        `   - handle: ${match.creator.handle} | followers: ${match.profile.followerCount} | wallets: ${match.creator.wallets.length}`,
      );
    }
  }
  console.log("");

  console.log("3) Checking FID 20721 GNARS balances via Neynar...");
  const balances = await fetchFarcasterUserCoinsUncached(TARGET_FID);
  const gnarsBalances = balances.filter(
    (balance) => balance.address?.toLowerCase() === GNARS_COIN_ADDRESS.toLowerCase(),
  );
  const gnarsTotal = gnarsBalances.reduce((sum, balance) => sum + toNumber(balance.balance), 0);

  if (gnarsBalances.length === 0) {
    console.log("   ❌ No GNARS token balances returned for FID 20721.");
  } else {
    console.log(`   ✅ GNARS balances returned: ${gnarsBalances.length}`);
    console.log(`   Total GNARS (raw in_token): ${gnarsTotal}`);
  }
  console.log("");

  console.log("4) Checking if follower ranking excludes FID 20721...");
  const ranked = matchedCreators
    .filter(Boolean)
    .sort((a, b) => (b?.profile.followerCount ?? 0) - (a?.profile.followerCount ?? 0));

  const rankIndex = ranked.findIndex((match) => match?.profile.fid === TARGET_FID);
  if (rankIndex === -1) {
    console.log("   ❌ FID 20721 is not in the Farcaster match list.");
  } else {
    const inRange = rankIndex < MAX_FARCASTER_USERS;
    console.log(
      `   ${inRange ? "✅" : "❌"} FID 20721 rank: ${rankIndex + 1} / ${ranked.length} (limit ${MAX_FARCASTER_USERS})`,
    );
  }
  console.log("");

  console.log("5) Checking if FID 20721 appears in farcaster items...");
  const itemsForFid = data.items.filter((item) => item.farcasterFid === TARGET_FID);
  if (itemsForFid.length === 0) {
    console.log("   ❌ No Farcaster TV items for FID 20721.");
  } else {
    console.log(`   ✅ Found ${itemsForFid.length} Farcaster TV item(s) for FID 20721.`);
  }

  console.log("\n✅ Debug complete.");
}

debugSkateboard().catch((error) => {
  console.error(error);
  process.exit(1);
});
