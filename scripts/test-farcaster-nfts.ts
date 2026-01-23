/**
 * Test script for Neynar Farcaster NFT holdings.
 *
 * Run with: npx tsx scripts/test-farcaster-nfts.ts <fid>
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

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

const NEYNAR_REST_BASE_URL = "https://api.neynar.com/v2";

async function testFarcasterNFTs() {
  const apiKey = process.env.NEYNAR_API_KEY;
  const rawFid = process.argv[2] ?? "3";
  const fid = Number(rawFid);

  if (!Number.isFinite(fid)) {
    console.error(`Invalid fid: ${rawFid}`);
    process.exit(1);
  }

  if (!apiKey) {
    console.error("NEYNAR_API_KEY is not set. Make sure it's in .env.local");
    process.exit(1);
  }

  console.log(`🧬 Checking NFT holdings for fid ${fid}\n`);

  try {
    const url = new URL(`${NEYNAR_REST_BASE_URL}/farcaster/user/nfts`);
    url.searchParams.set("fid", String(fid));
    url.searchParams.set("network", "base");

    const response = await fetch(url.toString(), {
      headers: {
        api_key: apiKey,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 404) {
      console.log("Neynar v2 does not expose an NFT holdings endpoint yet.");
      console.log("Returning empty results as expected.\n");
      console.log("Found 0 NFTs");
      return;
    }

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(text);
      process.exit(1);
    }

    const payload = (await response.json()) as any;
    const nfts = payload.nfts || payload.result?.nfts || payload.user_nfts || [];

    console.log(`Found ${nfts.length} NFTs\n`);
    for (const nft of nfts.slice(0, 12)) {
      const imageUrl =
        nft.image_url || nft.image || nft.metadata?.image || nft.collection?.image_url;
      console.log(`- ${nft.name || "Untitled"} (${nft.collection?.name || "Unknown collection"})`);
      console.log(`  contract: ${nft.contract_address ?? "unknown"}`);
      console.log(`  tokenId: ${nft.token_id ?? "unknown"}`);
      console.log(`  chain: ${nft.chain ?? nft.network ?? "unknown"}`);
      console.log(`  image: ${imageUrl ?? "none"}\n`);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testFarcasterNFTs();
