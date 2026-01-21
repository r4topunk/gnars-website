// Development mode flag - use NEXT_PUBLIC prefix so it's available in browser
// This allows runtime checking instead of build-time replacement
export const IS_DEV = process.env.NODE_ENV === "development";

export const CHAIN = {
  id: 8453,
  name: "base",
} as const;

export const GNARS_ADDRESSES = {
  token: "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17",
  auction: "0x494eaa55ecf6310658b8fc004b0888dcb698097f",
  // Hacker Dao Governor
  // governor: "0x7c4c33efe412f06f83278acafc16b435be904b03",
  // Gnars Governor  
  governor: "0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c",
  treasury: "0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88",
  metadata: "0xdc9799d424ebfdcf5310f3bad3ddcce3931d4b58",
  gnarsErc20: "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b", // $GNARS ERC20 token
  lootbox: "0xc934804520ccc172909a093bae5bb07188e77cb2", // Gnars Lootbox V4
  lootboxTestNft: "0x6940100c44d214cd1570b394a1c42949c3eb820d", // HackerDAO Test NFT
} as const;

export const ZORA_CREATOR = {
  base: "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b",
} as const;

// Gnars Creator Coin (used as backing currency for content coins)
// This is the official GNARS creator coin on Base used for pairing content coins
export const GNARS_CREATOR_COIN = "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b" as const;

// Zora Factory contract on Base
export const ZORA_FACTORY_ADDRESS = "0x777777751622c0d3258f214F9DF38E35BF45baF3" as const;

// Platform referrer for Zora coin creation (Gnars DAO treasury receives referral rewards)
export const PLATFORM_REFERRER = GNARS_ADDRESSES.treasury;

// Droposal target (the contract used by Gnars droposals on Base)
export const DROPOSAL_TARGET = {
  base: "0x58c3ccb2dcb9384e5ab9111cd1a5dea916b0f33c",
} as const;

// Default mint limit per address for droposals (effectively unlimited)
export const DROPOSAL_DEFAULT_MINT_LIMIT = 1000000 as const;

// 0xSplits contract addresses for revenue sharing
export const SPLITS_ADDRESSES = {
  // SplitMain contract on Base - used to create new splits
  splitMain: "0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE",
} as const;

export const SUBGRAPH = {
  // Official Nouns Builder Subgraph URL for Gnars on Base (Goldsky public)
  url: `https://api.goldsky.com/api/public/${process.env.NEXT_PUBLIC_GOLDSKY_PROJECT_ID || "project_cm33ek8kjx6pz010i2c3w8z25"}/subgraphs/nouns-builder-base-mainnet/latest/gn`,
} as const;

export const DAO_DESCRIPTION =
  "Nounish Open Source Action Sports Brand experiment";

export const HOMEPAGE_DESCRIPTIONS = [
  "Nounish Open Source Action Sports Brand experiment",
  "Funding extreme sports athletes and creators worldwide",
  "Building the future of shredding",
  "Empowering athletes through collective governance",
  "Has funded 15 skatable sculptures around the world",
  "é foda pra caralho!"
] as const;

// Token contracts we care about for treasury display
// Provide Base mainnet addresses for known tokens
export const TREASURY_TOKEN_ALLOWLIST = {
  USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  WETH: "0x4200000000000000000000000000000000000006",
  SENDIT: "0xBa5B9B2D2d06a9021EB3190ea5Fb0e02160839A4",
} as const;

export const TREASURY_TOKEN_ADDRESSES = Object.values(TREASURY_TOKEN_ALLOWLIST);

export const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://gnars-shadcn.vercel.app";
