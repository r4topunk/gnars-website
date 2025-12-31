import { NextResponse } from "next/server";
import {
  getCoin,
  getCoinHolders,
  getProfile,
  getProfileCoins,
} from "@zoralabs/coins-sdk";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";
import { fetchGnarsPairedCoins } from "@/lib/zora-coins-subgraph";
import { fetchDroposals } from "@/services/droposals";

export const runtime = "edge";
export const revalidate = 3600; // Cache for 1 hour

// Gnars addresses
const GNARS_COIN_ADDRESS = "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b";
const GNARS_NFT_ADDRESS = "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17";
const GNARS_PROFILE_HANDLE = "gnars";

// Minimum requirements
const MIN_COIN_BALANCE = 300_000;
const MIN_NFT_BALANCE = 1;

// Concurrency limits to avoid rate limiting
const MAX_CONCURRENT_PROFILE_FETCHES = 10;
const MAX_CONCURRENT_COIN_FETCHES = 15;

// RPC client
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const rpcUrl = alchemyKey
  ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : "https://mainnet.base.org";

const viemClient = createPublicClient({
  chain: base,
  transport: http(rpcUrl),
});

const erc721Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);

interface QualifiedCreator {
  handle: string;
  avatarUrl: string | null;
  coinBalance: number;
  nftBalance: number;
  wallets: string[];
}

interface TVItemData {
  id: string;
  title: string;
  creator: string;
  creatorName?: string;
  creatorAvatar?: string;
  symbol?: string;
  imageUrl?: string;
  videoUrl?: string;
  coinAddress?: string;
  marketCap?: number;
  uniqueHolders?: number;
  poolCurrencyTokenAddress?: string;
  createdAt?: string;
  isDroposal?: boolean;
  priceEth?: string;
  proposalNumber?: number;
}

// SDK response types
interface TokenBalanceNode {
  balance: string;
  ownerProfile?: {
    __typename?: string;
    handle?: string;
    avatar?: {
      previewImage?: {
        medium?: string;
        small?: string;
      };
    };
  };
}

interface TokenBalanceEdge {
  node?: TokenBalanceNode;
}

interface LinkedWalletEdge {
  node?: { walletAddress?: string };
}

interface ZoraProfileWithWallets {
  publicWallet?: { walletAddress?: string };
  linkedWallets?: { edges?: LinkedWalletEdge[] };
}

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
  concurrency: number
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
        const settled = await Promise.race([
          executing[i].then(() => true),
          Promise.resolve(false),
        ]);
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
 * Batch check NFT balances using multicall
 */
async function batchCheckNftBalances(
  wallets: string[]
): Promise<Map<string, number>> {
  if (wallets.length === 0) return new Map();

  console.log(`[api/tv] Checking NFT balances for ${wallets.length} wallets via multicall`);

  try {
    const contracts = wallets.map((wallet) => ({
      address: GNARS_NFT_ADDRESS as `0x${string}`,
      abi: erc721Abi,
      functionName: "balanceOf" as const,
      args: [wallet as `0x${string}`],
    }));

    const results = await viemClient.multicall({
      contracts,
      allowFailure: true,
    });

    const balances = new Map<string, number>();
    for (let i = 0; i < wallets.length; i++) {
      const result = results[i];
      if (result.status === "success") {
        balances.set(wallets[i].toLowerCase(), Number(result.result));
      } else {
        balances.set(wallets[i].toLowerCase(), 0);
      }
    }

    return balances;
  } catch (err) {
    console.warn("[api/tv] Multicall failed, falling back to individual calls:", err);
    // Fallback to individual calls
    const balances = new Map<string, number>();
    await Promise.all(
      wallets.map(async (wallet) => {
        try {
          const balance = await viemClient.readContract({
            address: GNARS_NFT_ADDRESS as `0x${string}`,
            abi: erc721Abi,
            functionName: "balanceOf",
            args: [wallet as `0x${string}`],
          });
          balances.set(wallet.toLowerCase(), Number(balance));
        } catch {
          balances.set(wallet.toLowerCase(), 0);
        }
      })
    );
    return balances;
  }
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
function mapCoinToTVItem(
  coin: CoinNode,
  creatorHandle: string
): TVItemData | null {
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

interface CandidateCreator {
  handle: string;
  avatarUrl: string | null;
  coinBalance: number;
  wallets: string[];
}

/**
 * Fetch candidate creators from coin holders
 * Returns creators with sufficient coin balance but not yet verified for NFT ownership
 */
async function fetchCandidateCreators(): Promise<CandidateCreator[]> {
  console.log("[api/tv] Fetching coin holders...");

  const candidates: CandidateCreator[] = [];
  const seenHandles = new Set<string>();

  // Fetch all pages of coin holders first (these are quick)
  let cursor: string | undefined;
  let page = 1;

  while (page <= 5) {
    try {
      const result = await getCoinHolders({
        address: GNARS_COIN_ADDRESS as `0x${string}`,
        chainId: 8453,
        count: 50,
        after: cursor,
      });

      const tokenBalances = result?.data?.zora20Token?.tokenBalances;
      const edges = tokenBalances?.edges || [];
      const pageInfo = tokenBalances?.pageInfo;

      for (const edge of edges as TokenBalanceEdge[]) {
        const node = edge.node;
        if (!node) continue;

        const profile = node.ownerProfile;
        const hasZoraAccount = profile?.__typename === "GraphQLAccountProfile";
        const handle = profile?.handle;

        if (!hasZoraAccount || !handle || seenHandles.has(handle)) continue;
        seenHandles.add(handle);

        const rawBalance = node.balance || "0";
        const balanceNum = Number(BigInt(rawBalance)) / 1e18;

        if (balanceNum < MIN_COIN_BALANCE) continue;

        const avatarUrl =
          profile?.avatar?.previewImage?.medium ||
          profile?.avatar?.previewImage?.small ||
          null;

        candidates.push({
          handle,
          avatarUrl,
          coinBalance: balanceNum,
          wallets: [], // Will be filled by profile fetch
        });
      }

      if (!pageInfo?.hasNextPage) break;
      cursor = pageInfo.endCursor;
      page++;
    } catch (err) {
      console.warn("[api/tv] Failed to fetch coin holders page:", err);
      break;
    }
  }

  console.log(`[api/tv] Found ${candidates.length} candidate creators with sufficient coin balance`);
  return candidates;
}

/**
 * Fetch profile wallets for candidates with concurrency limit
 */
async function fetchProfileWallets(
  candidates: CandidateCreator[]
): Promise<CandidateCreator[]> {
  console.log(`[api/tv] Fetching profile wallets for ${candidates.length} candidates...`);

  const results = await runWithConcurrency(
    candidates,
    async (candidate) => {
      try {
        const profileResult = await getProfile({ identifier: candidate.handle });
        const fullProfile = profileResult?.data?.profile;
        if (!fullProfile) return candidate;

        const wallets: string[] = [];

        if (fullProfile.publicWallet?.walletAddress) {
          wallets.push(fullProfile.publicWallet.walletAddress.toLowerCase());
        }

        const profileWithWallets = fullProfile as ZoraProfileWithWallets;
        const linkedEdges = profileWithWallets.linkedWallets?.edges || [];
        for (const linkedEdge of linkedEdges) {
          const addr = linkedEdge.node?.walletAddress?.toLowerCase();
          if (addr && !wallets.includes(addr)) {
            wallets.push(addr);
          }
        }

        return { ...candidate, wallets };
      } catch {
        return candidate;
      }
    },
    MAX_CONCURRENT_PROFILE_FETCHES
  );

  return results.filter((c) => c.wallets.length > 0);
}

/**
 * Fetch qualified creators - coin + NFT holders
 * Optimized with batch NFT balance checks via multicall
 */
async function fetchQualifiedCreators(): Promise<QualifiedCreator[]> {
  // Step 1: Get candidates with sufficient coin balance
  const candidates = await fetchCandidateCreators();

  // Step 2: Fetch profile wallets with concurrency limit
  const candidatesWithWallets = await fetchProfileWallets(candidates);

  // Step 3: Collect all unique wallets for batch NFT check
  const allWallets = new Set<string>();
  for (const candidate of candidatesWithWallets) {
    for (const wallet of candidate.wallets) {
      allWallets.add(wallet.toLowerCase());
    }
  }

  // Step 4: Batch check all NFT balances in one multicall
  const nftBalances = await batchCheckNftBalances(Array.from(allWallets));

  // Step 5: Filter to qualified creators
  const qualifiedCreators: QualifiedCreator[] = [];

  for (const candidate of candidatesWithWallets) {
    let totalNfts = 0;
    for (const wallet of candidate.wallets) {
      totalNfts += nftBalances.get(wallet.toLowerCase()) || 0;
    }

    if (totalNfts >= MIN_NFT_BALANCE) {
      qualifiedCreators.push({
        handle: candidate.handle,
        avatarUrl: candidate.avatarUrl,
        coinBalance: candidate.coinBalance,
        nftBalance: totalNfts,
        wallets: candidate.wallets,
      });
      console.log(
        `[api/tv] Qualified: ${candidate.handle} (${Math.round(candidate.coinBalance)} coins, ${totalNfts} NFTs)`
      );
    }
  }

  console.log(`[api/tv] Found ${qualifiedCreators.length} qualified creators`);
  return qualifiedCreators;
}

/**
 * Fetch content from creators with concurrency limit
 */
async function fetchCreatorContent(
  creators: QualifiedCreator[],
  loadedAddresses: Set<string>
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

        const edges = (response?.data?.profile?.createdCoins?.edges ||
          []) as CoinEdge[];

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
    MAX_CONCURRENT_COIN_FETCHES
  );

  console.log(`[api/tv] Fetched ${allItems.length} items from creators`);
  return allItems;
}

/**
 * Fetch GNARS-paired coins from subgraph with concurrency limit
 */
async function fetchPairedCoins(
  loadedAddresses: Set<string>
): Promise<TVItemData[]> {
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

          const creatorHandle =
            coin?.creatorProfile?.handle || pairedCoin.coin.slice(0, 10);

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
      MAX_CONCURRENT_COIN_FETCHES
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
async function fetchGnarsProfileContent(
  loadedAddresses: Set<string>
): Promise<TVItemData[]> {
  console.log("[api/tv] Fetching Gnars profile content...");

  try {
    const response = await getProfileCoins({
      identifier: GNARS_PROFILE_HANDLE,
      count: 50,
    });

    const edges = (response?.data?.profile?.createdCoins?.edges ||
      []) as CoinEdge[];

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

/**
 * Map droposal to TV item
 */
function mapDroposalToTVItem(droposal: {
  proposalId: string;
  proposalNumber: number;
  title: string;
  name?: string;
  bannerImage?: string;
  animationUrl?: string;
  priceEth?: string;
  createdAt: number;
  executedAt?: number;
}): TVItemData | null {
  const mediaUrl = droposal.animationUrl || droposal.bannerImage;
  if (!mediaUrl) return null;

  const isVideo =
    mediaUrl.includes(".mp4") ||
    mediaUrl.includes(".webm") ||
    mediaUrl.includes(".mov");

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
    // - Qualified creators (coin holders + profile wallets + NFT check)
    const [pairedCoins, gnarsContent, droposals, qualifiedCreators] =
      await Promise.all([
        fetchPairedCoins(loadedAddresses),
        fetchGnarsProfileContent(loadedAddresses),
        fetchDroposals(50).catch(() => []),
        fetchQualifiedCreators(),
      ]);

    // Phase 2: Fetch creator content (depends on qualified creators list)
    const creatorContent = await fetchCreatorContent(
      qualifiedCreators,
      loadedAddresses
    );

    // Map droposals
    const droposalItems = droposals
      .map(mapDroposalToTVItem)
      .filter((item): item is TVItemData => item !== null);

    // Combine all sources (paired coins have highest priority)
    const allItems = [
      ...pairedCoins,
      ...creatorContent,
      ...gnarsContent,
      ...droposalItems,
    ];

    // Sort by createdAt (newest first)
    allItems.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const elapsed = Date.now() - startTime;
    console.log(`[api/tv] Feed ready: ${allItems.length} items in ${elapsed}ms`);
    console.log(
      `[api/tv] Sources: ${pairedCoins.length} paired, ${creatorContent.length} creators, ${gnarsContent.length} gnars, ${droposalItems.length} droposals`
    );

    return NextResponse.json({
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
      },
      fetchedAt: new Date().toISOString(),
      durationMs: elapsed,
    });
  } catch (error) {
    console.error("[api/tv] Feed fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch TV feed" },
      { status: 500 }
    );
  }
}
