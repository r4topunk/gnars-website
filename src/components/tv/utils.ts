/**
 * Configuration and utility functions for Gnars TV
 *
 * Data sources:
 * 1. Coins bought by Gnars Treasury (with video content)
 * 2. Videos from creators whose creator coins Gnars holds
 * 3. Droposals (NFT drops from DAO proposals)
 */

import type { CoinMedia, CoinNode, TVItem } from "./types";
import type { DroposalListItem } from "@/services/droposals";
import { GNARS_ADDRESSES, GNARS_CREATOR_COIN, GNARS_ZORA_HANDLE } from "@/lib/config";

// Re-export for convenience
export const GNARS_TREASURY = GNARS_ADDRESSES.treasury;
export { GNARS_CREATOR_COIN, GNARS_ZORA_HANDLE };
export const SKATEHIVE_REFERRER = "0xb4964e1eca55db36a94e8aeffbfbab48529a2f6c";

// Broken droposal contracts to exclude from TV feed
export const BROKEN_DROPOSAL_CONTRACTS = [
  "0x9e1038b1ff820849edf6eff36a93d7eadc917026",
];

// Broken droposal proposal numbers to exclude from TV feed
export const BROKEN_DROPOSAL_PROPOSALS = [69];

// Pagination config
export const INITIAL_COINS_PER_CREATOR = 50;
export const PRELOAD_THRESHOLD = 10;

// Fallback items when no content is available
export const FALLBACK_ITEMS: TVItem[] = [
  {
    id: "fallback-gnars",
    title: "Gnars DAO",
    creator: GNARS_TREASURY,
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

  const uniqueHolders = coin?.uniqueHolders || coin?.coin?.uniqueHolders;

  const createdAt = coin?.createdAt || coin?.coin?.createdAt;

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
    uniqueHolders: uniqueHolders,
    createdAt: createdAt,
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
 * Check if an item was created on Skatehive
 */
export function isSkatehive(item: TVItem): boolean {
  return item.platformReferrer === SKATEHIVE_REFERRER;
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

  // Exclude broken droposals by proposal number
  if (BROKEN_DROPOSAL_PROPOSALS.includes(droposal.proposalNumber)) {
    return null;
  }

  // Exclude broken droposal contracts (if tokenAddress is available)
  if (droposal.tokenAddress && BROKEN_DROPOSAL_CONTRACTS.includes(droposal.tokenAddress.toLowerCase())) {
    return null;
  }

  // Use executedAt if available, otherwise createdAt (timestamps are in milliseconds)
  const timestamp = droposal.executedAt || droposal.createdAt;
  const createdAt = timestamp ? new Date(timestamp).toISOString() : undefined;

  return {
    id: `droposal-${droposal.proposalId}`,
    title: droposal.name || droposal.title,
    creator: droposal.fundsRecipient || GNARS_TREASURY,
    creatorName: "Gnars DAO",
    creatorAvatar: "/gnars.webp", // Use Gnars logo for droposals
    symbol: droposal.symbol,
    imageUrl: droposal.bannerImage,
    videoUrl: droposal.animationUrl,
    createdAt: createdAt,
    // Droposal-specific fields
    isDroposal: true,
    priceEth: droposal.priceEth,
    proposalNumber: droposal.proposalNumber,
    editionSize: droposal.editionSize,
    description: droposal.description,
    tokenAddress: droposal.tokenAddress, // May be undefined, resolved lazily
    executionTransactionHash: droposal.executionTransactionHash, // For resolving tokenAddress
  };
}
