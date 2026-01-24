import { NextResponse } from "next/server";
import { getCoin, getProfileCoins } from "@zoralabs/coins-sdk";
import { fetchGnarsPairedCoins } from "@/lib/zora-coins-subgraph";
import { fetchDroposals } from "@/services/droposals";
import {
  getFarcasterTVData,
  type QualifiedCreator,
  type TVItemData,
} from "@/services/farcaster-tv-aggregator";

export const dynamic = "force-dynamic";

// Gnars addresses
const GNARS_COIN_ADDRESS = "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b";
const GNARS_PROFILE_HANDLE = "gnars";

// Concurrency limits to avoid rate limiting
const MAX_CONCURRENT_COIN_FETCHES = 15;
const FARCASTER_FOLLOWER_BOOST_MAX_MS = 1000 * 60 * 60 * 6;
const FARCASTER_FOLLOWER_BOOST_CAP = 50_000;

interface CoinMedia {
  mimeType?: string;
  previewImage?: { url?: string; medium?: string; small?: string } | string;
  originalUri?: string;
  animationUrl?: string;
  videoUrl?: string;
  image?: string;
}

interface CoinNode {
  address?: string;
  contract?: string;
  name?: string;
  displayName?: string;
  symbol?: string;
  createdAt?: string;
  marketCap?: number;
  uniqueHolders?: number;
  poolCurrencyToken?: { address?: string };
  creatorProfile?: {
    handle?: string;
    avatar?: { previewImage?: { medium?: string; small?: string } };
  };
  mediaContent?: CoinMedia;
  media?: CoinMedia;
}

interface CoinEdge {
  node?: CoinNode | { coin?: CoinNode };
}

/**
 * Run promises with concurrency limit
 */
async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = fn(item).then((result) => {
      results.push(result);
    });

    executing.push(p);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      for (let i = executing.length - 1; i >= 0; i--) {
        // Check if promise is settled by racing with an instant resolve
        const settled = await Promise.race([executing[i].then(() => true), Promise.resolve(false)]);
        if (settled) {
          executing.splice(i, 1);
        }
      }
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Extract video URL from coin media
 */
function extractVideoUrl(coin: CoinNode): string | undefined {
  const media = coin.mediaContent || coin.media;
  if (!media) return undefined;

  const mimeType = media.mimeType?.toLowerCase() || "";
  if (mimeType.startsWith("video/")) {
    return media.originalUri || media.animationUrl || media.videoUrl;
  }

  const uri = media.originalUri || media.animationUrl || media.videoUrl;
  if (uri) {
    const lower = uri.toLowerCase();
    if (
      lower.includes(".mp4") ||
      lower.includes(".webm") ||
      lower.includes(".mov") ||
      lower.includes("video")
    ) {
      return uri;
    }
  }

  return undefined;
}

/**
 * Extract image URL from coin media
 */
function extractImageUrl(coin: CoinNode): string | undefined {
  const media = coin.mediaContent || coin.media;
  if (!media) return undefined;

  const preview = media.previewImage;
  if (preview) {
    if (typeof preview === "string") return preview;
    return preview.medium || preview.small || preview.url;
  }

  return media.image;
}

/**
 * Map coin to TV item
 */
function mapCoinToTVItem(coin: CoinNode, creatorHandle: string): TVItemData | null {
  const videoUrl = extractVideoUrl(coin);
  const imageUrl = extractImageUrl(coin);

  // Skip if no media
  if (!videoUrl && !imageUrl) return null;

  const address = coin.address || coin.contract;
  if (!address) return null;

  return {
    id: address,
    title: coin.displayName || coin.name || "Untitled",
    creator: creatorHandle,
    creatorName: coin.creatorProfile?.handle,
    creatorAvatar:
      coin.creatorProfile?.avatar?.previewImage?.medium ||
      coin.creatorProfile?.avatar?.previewImage?.small,
    symbol: coin.symbol,
    imageUrl,
    videoUrl,
    coinAddress: address,
    marketCap: coin.marketCap,
    uniqueHolders: coin.uniqueHolders,
    poolCurrencyTokenAddress: coin.poolCurrencyToken?.address,
    createdAt: coin.createdAt,
  };
}

function computeFarcasterBoost(followerCount?: number): number {
  if (!followerCount || followerCount <= 0) return 0;
  const capped = Math.min(followerCount, FARCASTER_FOLLOWER_BOOST_CAP);
  return (capped / FARCASTER_FOLLOWER_BOOST_CAP) * FARCASTER_FOLLOWER_BOOST_MAX_MS;
}

/**
 * Fetch content from creators with concurrency limit
 */
async function fetchCreatorContent(
  creators: QualifiedCreator[],
  loadedAddresses: Set<string>,
): Promise<TVItemData[]> {
  console.log(`[api/tv] Fetching content from ${creators.length} creators...`);

  const allItems: TVItemData[] = [];

  await runWithConcurrency(
    creators,
    async (creator) => {
      try {
        const response = await getProfileCoins({
          identifier: creator.handle,
          count: 20,
        });

        const edges = (response?.data?.profile?.createdCoins?.edges || []) as CoinEdge[];

        for (const edge of edges) {
          const node = edge?.node;
          if (!node) continue;

          const coin = ("coin" in node ? node.coin : node) as CoinNode | undefined;
          if (!coin) continue;

          const addr = (coin.address || coin.contract)?.toLowerCase();
          if (!addr || loadedAddresses.has(addr)) continue;

          const item = mapCoinToTVItem(coin, creator.handle);
          if (item) {
            loadedAddresses.add(addr);
            allItems.push(item);
          }
        }
      } catch (err) {
        console.warn(`[api/tv] Failed to fetch content for ${creator.handle}:`, err);
      }
    },
    MAX_CONCURRENT_COIN_FETCHES,
  );

  console.log(`[api/tv] Fetched ${allItems.length} items from creators`);
  return allItems;
}

/**
 * Fetch GNARS-paired coins from subgraph with concurrency limit
 */
async function fetchPairedCoins(loadedAddresses: Set<string>): Promise<TVItemData[]> {
  console.log("[api/tv] Fetching GNARS-paired coins...");

  try {
    const pairedCoins = await fetchGnarsPairedCoins({ first: 100 });

    if (!pairedCoins.length) {
      console.log("[api/tv] No paired coins in subgraph");
      return [];
    }

    console.log(`[api/tv] Found ${pairedCoins.length} paired coins, fetching details...`);

    const items: TVItemData[] = [];

    await runWithConcurrency(
      pairedCoins,
      async (pairedCoin) => {
        const coinAddress = pairedCoin.coin.toLowerCase();
        if (loadedAddresses.has(coinAddress)) return;

        try {
          const response = await getCoin({
            address: coinAddress as `0x${string}`,
            chain: 8453,
          });

          const coin = response?.data?.zora20Token as CoinNode | undefined;
          if (!coin) return;

          const creatorHandle = coin?.creatorProfile?.handle || pairedCoin.coin.slice(0, 10);

          const item = mapCoinToTVItem(coin, creatorHandle);

          if (item) {
            item.poolCurrencyTokenAddress = GNARS_COIN_ADDRESS;
            loadedAddresses.add(coinAddress);
            items.push(item);
          }
        } catch {
          // Skip on error
        }
      },
      MAX_CONCURRENT_COIN_FETCHES,
    );

    console.log(`[api/tv] Loaded ${items.length} GNARS-paired coins with media`);
    return items;
  } catch (err) {
    console.warn("[api/tv] Failed to fetch paired coins:", err);
    return [];
  }
}

/**
 * Fetch Gnars profile content
 */
async function fetchGnarsProfileContent(loadedAddresses: Set<string>): Promise<TVItemData[]> {
  console.log("[api/tv] Fetching Gnars profile content...");

  try {
    const response = await getProfileCoins({
      identifier: GNARS_PROFILE_HANDLE,
      count: 50,
    });

    const edges = (response?.data?.profile?.createdCoins?.edges || []) as CoinEdge[];

    const items = edges
      .map((edge) => {
        const node = edge?.node;
        if (!node) return null;

        const coin = ("coin" in node ? node.coin : node) as CoinNode | undefined;
        if (!coin) return null;

        const addr = (coin.address || coin.contract)?.toLowerCase();
        if (!addr || loadedAddresses.has(addr)) return null;

        const item = mapCoinToTVItem(coin, GNARS_PROFILE_HANDLE);
        if (item) {
          loadedAddresses.add(addr);
        }
        return item;
      })
      .filter((item): item is TVItemData => item !== null);

    console.log(`[api/tv] Loaded ${items.length} from Gnars profile`);
    return items;
  } catch (err) {
    console.warn("[api/tv] Failed to fetch Gnars profile:", err);
    return [];
  }
}

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"];

function normalizeMediaUrl(url: string) {
  return url.toLowerCase().split("?")[0];
}

async function isVideoUrl(mediaUrl: string): Promise<boolean> {
  const normalized = normalizeMediaUrl(mediaUrl);

  if (VIDEO_EXTENSIONS.some((ext) => normalized.endsWith(ext))) return true;
  if (IMAGE_EXTENSIONS.some((ext) => normalized.endsWith(ext))) return false;

  try {
    const response = await fetch(mediaUrl, { method: "HEAD" });
    const contentType = response.headers.get("content-type") || "";
    if (contentType.startsWith("video/")) return true;
    if (contentType.startsWith("image/")) return false;
  } catch (error) {
    console.warn("[api/tv] Failed to detect media type:", error);
  }

  return false;
}

/**
 * Map droposal to TV item
 */
async function mapDroposalToTVItem(droposal: {
  proposalId: string;
  proposalNumber: number;
  title: string;
  name?: string;
  bannerImage?: string;
  animationUrl?: string;
  priceEth?: string;
  createdAt: number;
  executedAt?: number;
}): Promise<TVItemData | null> {
  const mediaUrl = droposal.animationUrl || droposal.bannerImage;
  if (!mediaUrl) return null;

  const isVideo = droposal.animationUrl ? true : await isVideoUrl(mediaUrl);

  // Use executedAt if available (when the droposal was deployed), otherwise createdAt
  // Note: timestamps from droposals service are already in milliseconds
  const timestamp = droposal.executedAt || droposal.createdAt;

  return {
    id: `droposal-${droposal.proposalId}`,
    title: droposal.name || droposal.title || `Droposal #${droposal.proposalNumber}`,
    creator: "gnars",
    imageUrl: isVideo ? undefined : mediaUrl,
    videoUrl: isVideo ? mediaUrl : undefined,
    isDroposal: true,
    priceEth: droposal.priceEth,
    proposalNumber: droposal.proposalNumber,
    createdAt: new Date(timestamp).toISOString(),
  };
}

export async function GET() {
  const startTime = Date.now();
  console.log("[api/tv] Starting feed fetch...");

  const loadedAddresses = new Set<string>();

  try {
    // Phase 1: Fetch independent data sources in parallel
    // - Paired coins (subgraph + Zora API)
    // - Gnars profile content
    // - Droposals
    // - Farcaster TV aggregator (qualified creators + holdings)
    const [pairedCoins, gnarsContent, droposals, farcasterData] = await Promise.all([
      fetchPairedCoins(loadedAddresses),
      fetchGnarsProfileContent(loadedAddresses),
      fetchDroposals(50).catch(() => []),
      getFarcasterTVData(),
    ]);

    const qualifiedCreators = farcasterData.qualifiedCreators;

    // Phase 2: Fetch creator content (depends on qualified creators list)
    const creatorContent = await fetchCreatorContent(qualifiedCreators, loadedAddresses);

    // Map droposals
    const droposalItems = (await Promise.all(droposals.map(mapDroposalToTVItem))).filter(
      (item): item is TVItemData => item !== null,
    );

    const farcasterItemKeys = new Set<string>();
    const farcasterItems = farcasterData.items.filter((item) => {
      const address = item.coinAddress?.toLowerCase();
      if (item.farcasterFid && address) {
        const key = `${address}:${item.farcasterFid}`;
        if (farcasterItemKeys.has(key)) return false;
        farcasterItemKeys.add(key);
        return true;
      }
      if (!address) return true;
      if (loadedAddresses.has(address)) return false;
      loadedAddresses.add(address);
      return true;
    });

    // Combine all sources (paired coins have highest priority)
    const allItems = [
      ...pairedCoins,
      ...creatorContent,
      ...gnarsContent,
      ...farcasterItems,
      ...droposalItems,
    ];

    // Sort by createdAt (newest first) with a Farcaster follower-count boost
    allItems.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const boostedA = dateA + computeFarcasterBoost(a.farcasterFollowerCount);
      const boostedB = dateB + computeFarcasterBoost(b.farcasterFollowerCount);
      return boostedB - boostedA;
    });

    const elapsed = Date.now() - startTime;
    console.log(`[api/tv] Feed ready: ${allItems.length} items in ${elapsed}ms`);
    console.log(
      `[api/tv] Sources: ${pairedCoins.length} paired, ${creatorContent.length} creators, ${gnarsContent.length} gnars, ${farcasterItems.length} farcaster, ${droposalItems.length} droposals`,
    );
    console.log(`[api/tv] Farcaster cache: ${farcasterData.cache.source}`);

    const headers = new Headers();
    headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=3600");

    return NextResponse.json(
      {
        items: allItems,
        creators: qualifiedCreators.map((c) => ({
          handle: c.handle,
          avatarUrl: c.avatarUrl,
          coinBalance: c.coinBalance,
          nftBalance: c.nftBalance,
        })),
        stats: {
          total: allItems.length,
          withVideo: allItems.filter((i) => i.videoUrl).length,
          withImage: allItems.filter((i) => !i.videoUrl && i.imageUrl).length,
          gnarsPaired: pairedCoins.length,
          droposals: droposalItems.length,
          creatorsCount: qualifiedCreators.length,
          farcasterItems: farcasterItems.length,
          farcasterCreators: farcasterData.stats.creators,
          farcasterCoins: farcasterData.stats.coins,
          farcasterNfts: farcasterData.stats.nfts,
        },
        fetchedAt: new Date().toISOString(),
        durationMs: elapsed,
      },
      { headers },
    );
  } catch (error) {
    console.error("[api/tv] Feed fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch TV feed" }, { status: 500 });
  }
}
