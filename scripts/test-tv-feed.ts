/**
 * Test script for Gnars TV feed data flow
 *
 * Run with: npx tsx scripts/test-tv-feed.ts
 */

import { getProfileBalances, getProfileCoins, setApiKey } from "@zoralabs/coins-sdk";
import { fetchDroposals } from "../src/services/droposals";
import { GNARS_ZORA_HANDLE } from "../src/lib/config";

const INITIAL_COINS_PER_CREATOR = 50;

interface CoinData {
  address?: string;
  name?: string;
  symbol?: string;
  createdAt?: string;
  creatorAddress?: string;
  mediaContent?: {
    mimeType?: string;
    originalUri?: string;
  };
  creatorProfile?: {
    handle?: string;
  };
}

interface BalanceEdge {
  node: {
    balance: string;
    coin?: CoinData;
  };
}

interface CoinEdge {
  node?: CoinData | { coin?: CoinData };
}

interface VideoItem {
  name: string;
  creator: string;
  createdAt: string | null;
  type: "coin" | "droposal";
}

async function testTVFeed() {
  console.log("🎬 Testing Gnars TV Feed Data Flow\n");
  console.log("=".repeat(60));

  if (process.env.NEXT_PUBLIC_ZORA_API_KEY) {
    setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY);
    console.log("✅ Zora API key set\n");
  } else {
    console.log("⚠️  No NEXT_PUBLIC_ZORA_API_KEY found\n");
  }

  const creatorHandles: string[] = [];
  const allVideos: VideoItem[] = [];

  // Step 1: Fetch Gnars holdings
  console.log("📊 Fetching data...\n");

  try {
    const balancesResult = await getProfileBalances({
      identifier: GNARS_ZORA_HANDLE,
      count: 100,
      chainIds: [8453],
    });

    const balanceEdges = (balancesResult?.data?.profile?.coinBalances?.edges || []) as BalanceEdge[];

    for (const edge of balanceEdges) {
      const coin = edge.node?.coin;
      if (!coin) continue;

      const symbol = coin.symbol?.toLowerCase() || "";
      const hasVideo = coin.mediaContent?.mimeType?.startsWith("video/");

      if (hasVideo && coin.name) {
        allVideos.push({
          name: coin.name,
          creator: symbol,
          createdAt: coin.createdAt || null,
          type: "coin",
        });
      }

      if (symbol && !creatorHandles.includes(symbol)) {
        creatorHandles.push(symbol);
      }
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err}`);
  }

  // Fetch videos from creators
  for (const handle of creatorHandles.slice(0, 8)) {
    try {
      const response = await getProfileCoins({
        identifier: handle,
        count: INITIAL_COINS_PER_CREATOR,
      });

      const edges = (response?.data?.profile?.createdCoins?.edges || []) as CoinEdge[];

      for (const edge of edges) {
        const node = edge?.node;
        if (!node) continue;
        const coin = ("coin" in node ? node.coin : node) as CoinData | undefined;
        if (!coin) continue;

        const hasVideo = coin.mediaContent?.mimeType?.startsWith("video/");
        if (hasVideo && coin.name) {
          allVideos.push({
            name: coin.name,
            creator: handle,
            createdAt: coin.createdAt || null,
            type: "coin",
          });
        }
      }
    } catch {
      // ignore
    }
  }

  // Fetch droposals
  try {
    const droposals = await fetchDroposals(20);
    const videoDroposals = droposals.filter(d => d.animationUrl);

    for (const d of videoDroposals) {
      const timestamp = d.executedAt || d.createdAt;
      const createdAt = timestamp ? new Date(timestamp).toISOString() : null;

      allVideos.push({
        name: d.name || d.title,
        creator: "Gnars DAO",
        createdAt,
        type: "droposal",
      });
    }
  } catch {
    // ignore
  }

  // Sort by date
  const sorted = allVideos.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  // Find droposals positions
  console.log("📦 Droposals positions in feed:\n");
  sorted.forEach((v, i) => {
    if (v.type === "droposal") {
      const date = v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "No date";
      console.log(`   Position ${i + 1}: [${date}] ${v.name}`);
    }
  });

  // Summary
  const coins = allVideos.filter(v => v.type === "coin");
  const droposals = allVideos.filter(v => v.type === "droposal");

  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY\n");
  console.log(`   Total: ${allVideos.length} videos`);
  console.log(`   - Coins: ${coins.length}`);
  console.log(`   - Droposals: ${droposals.length}`);
  console.log("\n   Feed ordering: Newest first (temporal)");
  console.log("\n" + "=".repeat(60));
}

testTVFeed().catch(console.error);
