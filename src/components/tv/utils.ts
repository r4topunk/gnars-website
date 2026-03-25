/**
 * Configuration and utility functions for Gnars TV
 *
 * Data sources:
 * 1. Coins bought by Gnars Treasury (with video content)
 * 2. Videos from creators whose creator coins Gnars holds
 * 3. Droposals (NFT drops from DAO proposals)
 */

import type { CoinMedia, CoinNode, TVItem } from "./types";
import { DAO_ADDRESSES, GNARS_CREATOR_COIN } from "@/lib/config";

const GNARS_TREASURY = DAO_ADDRESSES.treasury;
const SKATEHIVE_REFERRER = "0xb4964e1eca55db36a94e8aeffbfbab48529a2f6c";

// Pagination config
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
function toHttpUrl(uri?: string | null): string | undefined {
  if (!uri) return undefined;
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return uri;
}

/**
 * Extract media URLs from a coin node
 */
function extractMediaFromCoin(coin: CoinNode): { imageUrl?: string; videoUrl?: string } {
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
