// Development mode flag - use NEXT_PUBLIC prefix so it's available in browser
// This allows runtime checking instead of build-time replacement
export const IS_DEV = process.env.NODE_ENV === "development";

export const CHAIN = {
  id: 8453,
  name: "base",
} as const;

// Core Builder DAO addresses — override via env vars to deploy for a different DAO
export const DAO_ADDRESSES = {
  token: (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ||
    "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17") as `0x${string}`,
  auction: (process.env.NEXT_PUBLIC_AUCTION_ADDRESS ||
    "0x494eaa55ecf6310658b8fc004b0888dcb698097f") as `0x${string}`,
  governor: (process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS ||
    "0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c") as `0x${string}`,
  treasury: (process.env.NEXT_PUBLIC_TREASURY_ADDRESS ||
    "0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88") as `0x${string}`,
  metadata: (process.env.NEXT_PUBLIC_METADATA_ADDRESS ||
    "0xdc9799d424ebfdcf5310f3bad3ddcce3931d4b58") as `0x${string}`,
  gnarsErc20: "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b", // $GNARS ERC20 token
} as const;

export const ZORA_CREATOR = {
  base: "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b",
} as const;

// Gnars Creator Coin (used as backing currency for content coins)
// This is the official GNARS creator coin on Base used for pairing content coins
export const GNARS_CREATOR_COIN = "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b" as const;

// Gnars Zora profile handle - used by SDK to resolve the GNARS creator coin
// The SDK expects a profile identifier (handle or wallet), not the token address directly
export const GNARS_ZORA_HANDLE = "gnars" as const;

// Creator allowlist — Zora handles that bypass the NFT qualification gate.
// Use for known community members whose wallets are fragmented across profiles.
export const GNARS_CREATOR_ALLOWLIST: readonly string[] = [
  "skatehacker", // vlad — NFTs on skateboard/maconhinha.base.eth wallets
  "nogenta", // nogenta — 9 NFTs, may fall outside top-200 subgraph scan
] as const;

// Zora Factory contract on Base
export const ZORA_FACTORY_ADDRESS = "0x777777751622c0d3258f214F9DF38E35BF45baF3" as const;

// Platform referrer for Zora coin creation (Gnars DAO treasury receives referral rewards)
export const PLATFORM_REFERRER = DAO_ADDRESSES.treasury;

// Droposal target (the contract used by Gnars droposals on Base)
export const DROPOSAL_TARGET = {
  base: "0x58c3ccb2dcb9384e5ab9111cd1a5dea916b0f33c",
} as const;

// Default mint limit per address for droposals (effectively unlimited)
export const DROPOSAL_DEFAULT_MINT_LIMIT = 1000000 as const;

// /swap (0x Swap API) — affiliate fee taken on the bought token when the
// user keeps the "Support Gnars treasury" checkbox checked.
// Recipient depends on chain: Base swaps land in the Gnars split contract;
// other chains route to the cross-chain fee recipient wallet.
export const SWAP_FEE_BPS = 50 as const; // 0.5%

export const SWAP_FEE_RECIPIENT_BASE =
  "0x15E69fD67DcC17E061Ceeb93DaC791e0f5aF0Eae" as `0x${string}`;

export const SWAP_FEE_RECIPIENT_MULTICHAIN =
  "0x96C37393B79aD7EABdF9Ccf82C2EDAd3d3c0eEA2" as `0x${string}`;

export function getSwapFeeRecipient(chainId: number): `0x${string}` {
  return chainId === CHAIN.id ? SWAP_FEE_RECIPIENT_BASE : SWAP_FEE_RECIPIENT_MULTICHAIN;
}

export const SUBGRAPH = {
  // Official Nouns Builder Subgraph URL for Gnars on Base (Goldsky public)
  url: `https://api.goldsky.com/api/public/${process.env.NEXT_PUBLIC_GOLDSKY_PROJECT_ID || "project_cm33ek8kjx6pz010i2c3w8z25"}/subgraphs/nouns-builder-base-mainnet/latest/gn`,

  // Legacy Gnars subgraph on Ethereum mainnet (The Graph Studio)
  ethMainnet: "https://api.studio.thegraph.com/query/84885/gnars-mainnet/v1.0.0",
} as const;

export const GNARS_ADDRESSES_ETH = {
  token: "0x558bfff0d583416f7c4e380625c7865821b8e95c",
  governor: "0xd10e3dee203579fcee90ed7d0bdd8086f7e53beb",
  treasury: "0x4d3a210f40f83286dc5e4d3fe285dcfef30cce52",
} as const;

export const DAO_DESCRIPTION = "Nounish Open Source Action Sports Brand experiment";

// Token contracts we care about for treasury display
// Provide Base mainnet addresses for known tokens
export const TREASURY_TOKEN_ALLOWLIST = {
  USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  WETH: "0x4200000000000000000000000000000000000006",
  SENDIT: "0xBa5B9B2D2d06a9021EB3190ea5Fb0e02160839A4",
} as const;

export const TREASURY_TOKEN_ADDRESSES = Object.values(TREASURY_TOKEN_ALLOWLIST);

/**
 * /store checkout config. Customers pay USDC on Base to `recipient`; the server verifies that
 * transfer before forwarding the order to the fulfillment provider (KeepKey). `recipient` is
 * the dedicated Gnars store wallet — hardcoded here (public address, safe to commit) with an
 * env override for other deploys. Secrets (KeepKey tokens/webhook) stay in env. USDC on Base
 * has 6 decimals. Sandbox orders skip payment, so this is only used in live mode.
 */
export const STORE_CHECKOUT = {
  usdc: TREASURY_TOKEN_ALLOWLIST.USDC as `0x${string}`,
  usdcDecimals: 6,
  recipient: (process.env.NEXT_PUBLIC_STORE_CHECKOUT_ADDRESS ||
    "0x8Bf5941d27176242745B716251943Ae4892a3C26") as `0x${string}`,
} as const;

/**
 * KeepKey dropship fulfillment mode. `test` (sandbox) draws no credit and never ships;
 * `live` places real orders that draw the credit line and owe crypto settlement.
 *
 * Default stays `test` on purpose — going live is a deliberate act, never a side effect of
 * a deploy. The env var (`KEEPKEY_DROPSHIP_MODE`, NOT `NEXT_PUBLIC_`) overrides it in Vercel.
 * Read only server-side via `isSandbox()` — do not branch on this in client code (the env
 * value is not exposed to the browser, so it would always read `test` there).
 */
export const KEEPKEY_DROPSHIP_MODE = (process.env.KEEPKEY_DROPSHIP_MODE || "test") as
  | "test"
  | "live";

export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.gnars.com";
