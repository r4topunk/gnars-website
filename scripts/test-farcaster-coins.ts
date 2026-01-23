/**
 * Test script for Neynar Farcaster token balances.
 *
 * Run with: npx tsx scripts/test-farcaster-coins.ts <fid>
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";
import type { Network } from "@neynar/nodejs-sdk/build/api";

const GNARS_COIN_ADDRESS = "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b";

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

function parseUsd(value: string | null | undefined): number {
  if (!value) return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function isGnarsRelatedToken({
  address,
  name: _name,
  symbol: _symbol,
}: {
  address?: string | null;
  name?: string | null;
  symbol?: string | null;
}): boolean {
  // Strict, address-only match for the official GNARS coin.
  return Boolean(
    address && address.toLowerCase() === GNARS_COIN_ADDRESS.toLowerCase(),
  );
}

async function testFarcasterCoins() {
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

  const neynarClient = new NeynarAPIClient(
    new Configuration({
      apiKey,
      baseOptions: {
        headers: {
          "Content-Type": "application/json",
        },
      },
    })
  );

  console.log(`🪙 Fetching token balances for fid ${fid}\n`);

  try {
    const response = await neynarClient.fetchUserBalance({
      fid,
      networks: ["base" as Network],
    });

    const addressBalances = response.user_balance?.address_balances ?? [];
    const balances: any[] = [];

    for (const addressBalance of addressBalances) {
      const walletAddress = addressBalance.verified_address?.address ?? null;
      const tokenBalancesArray = addressBalance.token_balances || [];

      for (const tokenBalance of tokenBalancesArray) {
        const token = tokenBalance.token;
        const balance = tokenBalance.balance;

        const tokenAddress = token?.contract_address ?? token?.address;
        if (!tokenAddress || !balance) continue;

        balances.push({
          address: tokenAddress,
          name: token.name,
          symbol: token.symbol,
          balance: balance.in_token,
          balanceUsd: balance.in_usdc ?? null,
          walletAddress,
        });
      }
    }

    const sorted = [...balances].sort((a, b) => parseUsd(b.balanceUsd) - parseUsd(a.balanceUsd));
    const gnarsRelatedCount = sorted.filter((balance) =>
      isGnarsRelatedToken({
        address: balance.address,
        name: balance.name,
        symbol: balance.symbol,
      }),
    ).length;

    console.log(`Found ${balances.length} token balances\n`);
    for (const balance of sorted) {
      const isGnarsRelated = isGnarsRelatedToken({
        address: balance.address,
        name: balance.name,
        symbol: balance.symbol,
      });
      const marker = isGnarsRelated ? " ⚡ GNARS-RELATED" : "";
      console.log(`- ${balance.symbol} (${balance.name})${marker}`);
      console.log(`  address: ${balance.address}`);
      console.log(`  balance: ${balance.balance}`);
      console.log(`  balanceUsd: ${balance.balanceUsd ?? "n/a"}`);
      if (balance.walletAddress) {
        console.log(`  wallet: ${balance.walletAddress}`);
      }
      console.log("");
    }
    console.log(`Summary: ${balances.length} total tokens, ${gnarsRelatedCount} Gnars-related`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testFarcasterCoins();
