/**
 * Configuration and utility functions for Gnars TV
 */

import type { CoinMedia, CoinNode, TVItem } from "./types";
import type { DroposalListItem } from "@/services/droposals";

// Curated creator addresses for the TV feed
export const CREATOR_ADDRESSES = [
  "0xe8337b1f017ccf5461aea1d2e8bb1b00b76b993a", // shrimpdaddy
  "0x26331fda472639a54d02053a2b33dce5036c675b",
  "0xa642b91ff941fb68919d1877e9937f3e369dfd68",
  "0x2feb329b9289b60064904fa61fc347157a5aed6a", // zima
  "0xddb4938755c243a4f60a2f2f8f95df4f894c58cc", // will dias
  "0x406fdb58c6739a60bae0dd7c07ee903686344338",
  "0xc9f669e08820a0f89a5a8d4a5ce85e9236dd83b6",
  "0x1f1e8194c2dfcb3aa5cbb797d98ae83dda22c891", // humbertoperes
  "0xd1195629d9ba1168591b8ecdec9abb1721fcc7d8", // nogenta
  "0x0d7c91d415af609d3920b1e790fe7dfa72be789a", // alexandrefeliz
  "0x41cb654d1f47913acab158a8199191d160dabe4a", // vlad
  "0xb8f1e6f08bf1972084a16f824849e4ce5468e9e9", // rodrigo panajotti
  "0x3f9896f06e23f8229f50566f20a96ba39ce78071", // Isaac Houston 
];

// Gnars-related contract addresses
export const GNARS_TREASURY = "0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88";
export const GNARS_CREATOR_COIN = "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b";

// Pagination config
export const INITIAL_COINS_PER_CREATOR = 50;
export const LOAD_MORE_COINS_PER_CREATOR = 50;
export const PRELOAD_THRESHOLD = 10;

// Fallback items when no content is available
export const FALLBACK_ITEMS: TVItem[] = [
  {
    id: "fallback-gnars",
    title: "Gnars DAO",
    creator: CREATOR_ADDRESSES[0],
    symbol: "GNAR",
    imageUrl: "/gnars.webp",
    videoUrl: undefined,
  },
];

/**
 * Convert IPFS URIs to HTTP gateway URLs
 */
export function toHttpUrl(uri?: string | null): string | undefined {
  if (!uri) return undefined;
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return uri;
}

/**
 * Fisher-Yates shuffle algorithm for efficient random sorting
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Extract media URLs from a coin node
 */
export function extractMediaFromCoin(coin: CoinNode): { imageUrl?: string; videoUrl?: string } {
  const media: CoinMedia =
    coin?.mediaContent || coin?.media || coin?.coin?.mediaContent || coin?.coin?.media || {};

  const mimeType = media?.mimeType;

  const previewImage = media?.previewImage;
  const previewRaw =
    (typeof previewImage === "object"
      ? previewImage?.url || previewImage?.medium || previewImage?.small
      : previewImage) ||
    media?.previewUrl ||
    media?.image ||
    media?.posterUrl ||
    coin?.imageUrl;

  const originalRaw = media?.originalUri || media?.videoUrl;

  const imageUrl = toHttpUrl(previewRaw);

  let videoUrl: string | undefined;

  // Only accept explicit video media
  if (mimeType?.startsWith("video/")) {
    videoUrl = toHttpUrl(originalRaw || previewRaw);
  } else if (!mimeType && media?.videoUrl) {
    videoUrl = toHttpUrl(media.videoUrl);
  }

  return { imageUrl, videoUrl };
}

/**
 * Map a CoinNode to a TVItem
 */
export function mapCoinToTVItem(
  coin: CoinNode,
  idx: number,
  creatorAddress: string,
): TVItem | null {
  const media = extractMediaFromCoin(coin);
  if (!media.videoUrl) return null; // only video coins

  const creator = coin?.creatorProfile || coin?.coin?.creatorProfile;
  const creatorAvatar =
    creator?.avatar?.previewImage?.small || creator?.avatar?.previewImage?.medium;
  const creatorName =
    creator?.socialAccounts?.farcaster?.displayName ||
    creator?.socialAccounts?.twitter?.displayName ||
    creator?.handle;

  const marketCapRaw = coin?.marketCap || coin?.coin?.marketCap;
  const marketCapDelta24hRaw = coin?.marketCapDelta24h || coin?.coin?.marketCapDelta24h;

  const marketCap =
    typeof marketCapRaw === "string" ? parseFloat(marketCapRaw) : marketCapRaw || 0;
  const marketCapDelta24h =
    typeof marketCapDelta24hRaw === "string"
      ? parseFloat(marketCapDelta24hRaw)
      : marketCapDelta24hRaw || 0;

  const allTimeHigh = marketCap > 0 ? marketCap + Math.abs(marketCapDelta24h) : marketCap;

  const platformReferrer = (
    coin?.platformReferrerAddress ||
    coin?.platformReferrer ||
    coin?.coin?.platformReferrerAddress ||
    coin?.coin?.platformReferrer ||
    ""
  ).toLowerCase();

  const poolCurrencyTokenAddress = (
    coin?.poolCurrencyToken?.address ||
    coin?.coin?.poolCurrencyToken?.address ||
    ""
  ).toLowerCase();

  return {
    id: coin?.address || coin?.contract || coin?.id || `${creatorAddress}-${idx}`,
    title: coin?.name || coin?.displayName || "Untitled Coin",
    creator: creatorAddress,
    creatorName: creatorName,
    creatorAvatar: toHttpUrl(creatorAvatar),
    symbol: coin?.symbol,
    imageUrl: media.imageUrl || coin?.imageUrl,
    videoUrl: media.videoUrl,
    coinAddress: coin?.address || coin?.contract,
    marketCap: marketCap,
    allTimeHigh: allTimeHigh,
    platformReferrer: platformReferrer,
    poolCurrencyTokenAddress: poolCurrencyTokenAddress,
  };
}

/**
 * Interleave items from different creators within a group
 */
export function interleaveByCreator(items: TVItem[]): TVItem[] {
  const byCreator = new Map<string, TVItem[]>();
  items.forEach((item) => {
    const creator = item.creator;
    if (!byCreator.has(creator)) {
      byCreator.set(creator, []);
    }
    byCreator.get(creator)!.push(item);
  });

  // Shuffle each creator's videos
  byCreator.forEach((videos, creator) => {
    byCreator.set(creator, shuffleArray(videos));
  });

  const result: TVItem[] = [];
  // Shuffle creator order so the feed varies between sessions
  const creators = shuffleArray(Array.from(byCreator.keys()));
  let hasMore = true;

  while (hasMore) {
    hasMore = false;
    for (const creator of creators) {
      const videos = byCreator.get(creator)!;
      if (videos.length > 0) {
        result.push(videos.shift()!);
        hasMore = true;
      }
    }
  }

  return result;
}

/**
 * Sort and organize items by priority (Gnars Paired > Gnarly > Normal)
 */
export function sortByPriority(items: TVItem[]): TVItem[] {
  const paired = items.filter((item) => item.poolCurrencyTokenAddress === GNARS_CREATOR_COIN);
  const gnarly = items.filter(
    (item) =>
      item.platformReferrer === GNARS_TREASURY &&
      item.poolCurrencyTokenAddress !== GNARS_CREATOR_COIN,
  );
  const normal = items.filter(
    (item) =>
      item.platformReferrer !== GNARS_TREASURY &&
      item.poolCurrencyTokenAddress !== GNARS_CREATOR_COIN,
  );

  const interleavedPaired = interleaveByCreator(paired);
  const interleavedGnarly = interleaveByCreator(gnarly);
  const interleavedNormal = interleaveByCreator(normal);

  return [...interleavedPaired, ...interleavedGnarly, ...interleavedNormal];
}

/**
 * Check if an item is Gnars paired (uses Gnars Creator Coin as pool currency)
 */
export function isGnarsPaired(item: TVItem): boolean {
  return item.poolCurrencyTokenAddress === GNARS_CREATOR_COIN;
}

/**
 * Check if an item is Gnarly (uses Gnars Treasury as platform referrer)
 */
export function isGnarly(item: TVItem): boolean {
  return item.platformReferrer === GNARS_TREASURY;
}

/**
 * Check if an item is a droposal (NFT drop)
 */
export function isDroposal(item: TVItem): boolean {
  return item.isDroposal === true;
}

/**
 * Map a DroposalListItem to a TVItem (only if it has video content)
 */
export function mapDroposalToTVItem(droposal: DroposalListItem): TVItem | null {
  // Only include droposals with video content (animationUrl)
  if (!droposal.animationUrl) return null;

  return {
    id: `droposal-${droposal.proposalId}`,
    title: droposal.name || droposal.title,
    creator: droposal.fundsRecipient || GNARS_TREASURY,
    creatorName: "Gnars DAO",
    symbol: droposal.symbol,
    imageUrl: droposal.bannerImage,
    videoUrl: droposal.animationUrl,
    // Droposal-specific fields
    isDroposal: true,
    priceEth: droposal.priceEth,
    proposalNumber: droposal.proposalNumber,
    editionSize: droposal.editionSize,
    tokenAddress: droposal.tokenAddress, // May be undefined, resolved lazily
    transactionHash: undefined, // Not available from list, would need execution receipt
  };
}
