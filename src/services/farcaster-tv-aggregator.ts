import "server-only";

import { cache as reactCache } from "react";
import { unstable_cache } from "next/cache";
import { getCoin, getCoinHolders, getProfile } from "@zoralabs/coins-sdk";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";
import {
  assertNeynarApiKey,
  fetchFarcasterProfilesByAddress,
  fetchFarcasterProfilesByAddressUncached,
  fetchFarcasterUserCoins,
  fetchFarcasterUserCoinsUncached,
  fetchFarcasterUserNFTs,
  type FarcasterNftHolding,
  type FarcasterProfile,
  type FarcasterTokenBalance,
} from "@/services/farcaster";

const GNARS_COIN_ADDRESS = "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b";
const GNARS_NFT_ADDRESS = "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17";

const MIN_COIN_BALANCE = 300_000;
const MIN_NFT_BALANCE = 1;

const MAX_CONCURRENT_PROFILE_FETCHES = 10;
const MAX_CONCURRENT_COIN_FETCHES = 15;
const MAX_CONCURRENT_FARCASTER_FETCHES = 6;
const MAX_FARCASTER_HOLDINGS_PER_USER = 6;
const MAX_FARCASTER_USERS = 40;

const CACHE_REVALIDATE_SECONDS = 60 * 15;
const FARCASTER_TV_CACHE_KEY = "farcaster-tv-aggregator:v1";

const LRU_MAX_ENTRIES = 6;

// RPC client - prefer server-side ALCHEMY_API_KEY, fallback to NEXT_PUBLIC_ for compatibility
const alchemyKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const rpcUrl = alchemyKey
  ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : "https://mainnet.base.org";

const viemClient = createPublicClient({
  chain: base,
  transport: http(rpcUrl),
});

const erc721Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);

export interface QualifiedCreator {
  handle: string;
  avatarUrl: string | null;
  coinBalance: number;
  nftBalance: number;
  wallets: string[];
}

export interface TVItemData {
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
  farcasterFid?: number;
  farcasterUsername?: string;
  farcasterFollowerCount?: number;
  farcasterType?: "coin" | "nft";
}

export interface FarcasterTVData {
  qualifiedCreators: QualifiedCreator[];
  items: TVItemData[];
  stats: { creators: number; coins: number; nfts: number };
  durationMs: number;
  cache: { source: "lru" | "next" };
}

interface CandidateCreator {
  handle: string;
  avatarUrl: string | null;
  coinBalance: number;
  wallets: string[];
}

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

interface FarcasterCreatorMatch {
  profile: FarcasterProfile;
}

type FarcasterTVPayload = Omit<FarcasterTVData, "cache">;

class LruCache<T> {
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly store = new Map<string, { value: T; expiresAt: number }>();

  constructor(options: { maxEntries: number; ttlMs: number }) {
    this.maxEntries = options.maxEntries;
    this.ttlMs = options.ttlMs;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.store.size <= this.maxEntries) return;
    const oldest = this.store.keys().next().value;
    if (oldest) this.store.delete(oldest);
  }
}

const farcasterTvLru = new LruCache<FarcasterTVPayload>({
  maxEntries: LRU_MAX_ENTRIES,
  ttlMs: CACHE_REVALIDATE_SECONDS * 1000,
});

/**
 * Run promises with a concurrency limit.
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
      for (let i = executing.length - 1; i >= 0; i--) {
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

async function batchCheckNftBalances(wallets: string[]): Promise<Map<string, number>> {
  if (wallets.length === 0) return new Map();

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
    console.warn("[farcaster-tv] Multicall failed, falling back to individual calls:", err);
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
      }),
    );
    return balances;
  }
}

async function fetchCandidateCreators(): Promise<CandidateCreator[]> {
  const candidates: CandidateCreator[] = [];
  const seenHandles = new Set<string>();

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
          profile?.avatar?.previewImage?.medium || profile?.avatar?.previewImage?.small || null;

        candidates.push({
          handle,
          avatarUrl,
          coinBalance: balanceNum,
          wallets: [],
        });
      }

      if (!pageInfo?.hasNextPage) break;
      cursor = pageInfo.endCursor;
      page++;
    } catch (err) {
      console.warn("[farcaster-tv] Failed to fetch coin holders page:", err);
      break;
    }
  }

  return candidates;
}

async function fetchProfileWallets(candidates: CandidateCreator[]): Promise<CandidateCreator[]> {
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
    MAX_CONCURRENT_PROFILE_FETCHES,
  );

  return results.filter((c) => c.wallets.length > 0);
}

async function fetchQualifiedCreators(): Promise<QualifiedCreator[]> {
  const candidates = await fetchCandidateCreators();
  const candidatesWithWallets = await fetchProfileWallets(candidates);

  const allWallets = new Set<string>();
  for (const candidate of candidatesWithWallets) {
    for (const wallet of candidate.wallets) {
      allWallets.add(wallet.toLowerCase());
    }
  }

  const nftBalances = await batchCheckNftBalances(Array.from(allWallets));

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
    }
  }

  console.log("[farcaster-tv][qualified-creators] Total:", qualifiedCreators.length);
  for (const creator of qualifiedCreators) {
    console.log("[farcaster-tv][qualified-creators] Creator:", {
      handle: creator.handle,
      wallets: creator.wallets,
      coinBalance: creator.coinBalance,
      nftBalance: creator.nftBalance,
    });
  }

  console.log(
    `[farcaster-tv] Qualified creators (${qualifiedCreators.length}):`,
    qualifiedCreators.map((creator) => ({
      handle: creator.handle,
      wallets: creator.wallets,
      coinBalance: creator.coinBalance,
      nftBalance: creator.nftBalance,
    })),
  );

  return qualifiedCreators;
}

function rankByFollowerCount(matches: FarcasterCreatorMatch[]): FarcasterCreatorMatch[] {
  return [...matches].sort((a, b) => b.profile.followerCount - a.profile.followerCount);
}

async function fetchFarcasterMatches(
  creators: QualifiedCreator[],
  useCache = true,
): Promise<FarcasterCreatorMatch[]> {
  if (creators.length === 0) return [];

  const wallets = creators.flatMap((creator) => creator.wallets);
  console.log("[farcaster-tv][farcaster-match-start] Qualified creators:", creators.length);
  console.log("[farcaster-tv][farcaster-match-start] Wallets to Neynar:", wallets);
  const profilesByAddress = useCache
    ? await fetchFarcasterProfilesByAddress(wallets)
    : await fetchFarcasterProfilesByAddressUncached(wallets);

  console.log("[farcaster-tv][farcaster-match-start] Neynar wallet->profile:", profilesByAddress);
  console.log(
    "[farcaster-tv] Farcaster wallet matches:",
    wallets.map((wallet) => {
      const profile = profilesByAddress[wallet.toLowerCase()];
      return {
        wallet,
        fid: profile?.fid ?? null,
        username: profile?.username ?? null,
        followerCount: profile?.followerCount ?? null,
      };
    }),
  );

  const matches: FarcasterCreatorMatch[] = [];

  for (const creator of creators) {
    const profiles = creator.wallets
      .map((wallet) => profilesByAddress[wallet.toLowerCase()])
      .filter((profile): profile is FarcasterProfile => Boolean(profile));

    if (profiles.length === 0) {
      console.log("[farcaster-tv] Skipping creator (no Farcaster match):", {
        handle: creator.handle,
        wallets: creator.wallets,
      });
      continue;
    }

    const bestProfile = profiles.sort((a, b) => b.followerCount - a.followerCount)[0];
    matches.push({
      profile: bestProfile,
    });
  }

  console.log(
    "[farcaster-tv][farcaster-match-start] Final matches (fids):",
    matches.map((match) => ({
      fid: match.profile.fid,
      username: match.profile.username,
    })),
  );

  return matches;
}

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
  return Boolean(address && address.toLowerCase() === GNARS_COIN_ADDRESS.toLowerCase());
}

function selectTopFarcasterCoins(balances: FarcasterTokenBalance[]): FarcasterTokenBalance[] {
  const filtered = balances.filter(
    (balance) =>
      balance.address &&
      balance.balance !== "0" &&
      isGnarsRelatedToken({
        address: balance.address,
        name: balance.name,
        symbol: balance.symbol,
      }),
  );
  const sorted = [...filtered].sort((a, b) => parseUsd(b.balanceUsd) - parseUsd(a.balanceUsd));
  return sorted.slice(0, MAX_FARCASTER_HOLDINGS_PER_USER);
}

function selectTopFarcasterNFTs(nfts: FarcasterNftHolding[]): FarcasterNftHolding[] {
  const filtered = nfts.filter((nft) => {
    if (!nft.imageUrl) return false;
    if (!nft.chain) return true;
    return nft.chain.toLowerCase().includes("base") || nft.chain === "8453";
  });
  return filtered.slice(0, MAX_FARCASTER_HOLDINGS_PER_USER);
}

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

function mapCoinToTVItem(coin: CoinNode, creatorHandle: string): TVItemData | null {
  const videoUrl = extractVideoUrl(coin);
  const imageUrl = extractImageUrl(coin);

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

function mapFarcasterCoinToTVItem(
  coin: CoinNode,
  profile: FarcasterProfile,
  balance: FarcasterTokenBalance,
): TVItemData | null {
  const baseItem = mapCoinToTVItem(coin, profile.username);
  if (!baseItem) return null;

  return {
    ...baseItem,
    title: `${coin.displayName || coin.name || "Coin"} held by @${profile.username}`,
    creator: profile.username,
    creatorName: profile.displayName || profile.username,
    creatorAvatar: profile.pfpUrl ?? undefined,
    farcasterFid: profile.fid,
    farcasterUsername: profile.username,
    farcasterFollowerCount: profile.followerCount,
    farcasterType: "coin",
    marketCap: baseItem.marketCap,
    uniqueHolders: baseItem.uniqueHolders,
    poolCurrencyTokenAddress: baseItem.poolCurrencyTokenAddress,
  };
}

function mapFarcasterNftToTVItem(
  nft: FarcasterNftHolding,
  profile: FarcasterProfile,
): TVItemData | null {
  if (!nft.imageUrl) return null;

  const titleParts = [nft.name, nft.collectionName].filter(Boolean);
  const titleLabel = titleParts.length ? titleParts.join(" · ") : "NFT";

  return {
    id: `farcaster-nft-${profile.fid}-${nft.contractAddress ?? "unknown"}-${nft.tokenId ?? "0"}`,
    title: `${titleLabel} held by @${profile.username}`,
    creator: profile.username,
    creatorName: profile.displayName || profile.username,
    creatorAvatar: profile.pfpUrl ?? undefined,
    imageUrl: nft.imageUrl ?? undefined,
    createdAt: nft.acquiredAt ?? undefined,
    farcasterFid: profile.fid,
    farcasterUsername: profile.username,
    farcasterFollowerCount: profile.followerCount,
    farcasterType: "nft",
  };
}

async function fetchFarcasterHoldings(
  creators: QualifiedCreator[],
  useCache = true,
): Promise<{ items: TVItemData[]; stats: { creators: number; coins: number; nfts: number } }> {
  const matches = await fetchFarcasterMatches(creators, useCache);
  if (matches.length === 0) return { items: [], stats: { creators: 0, coins: 0, nfts: 0 } };

  const rankedAll = rankByFollowerCount(matches);
  console.log(
    "[farcaster-tv] Farcaster ranking (pre-limit):",
    rankedAll.map((match, index) => ({
      rank: index + 1,
      fid: match.profile.fid,
      username: match.profile.username,
      followerCount: match.profile.followerCount,
    })),
  );

  const ranked = rankedAll.slice(0, MAX_FARCASTER_USERS);
  if (ranked.length !== rankedAll.length) {
    console.log("[farcaster-tv] Farcaster ranking truncated:", {
      total: rankedAll.length,
      limit: MAX_FARCASTER_USERS,
    });
  }
  const farcasterLoadedKeys = new Set<string>();

  const items: TVItemData[] = [];
  let coinCount = 0;
  let nftCount = 0;

  await runWithConcurrency(
    ranked,
    async (match) => {
      const coinsPromise = useCache
        ? fetchFarcasterUserCoins(match.profile.fid)
        : fetchFarcasterUserCoinsUncached(match.profile.fid);
      const nftsPromise = fetchFarcasterUserNFTs(match.profile.fid);
      const [coins, nfts] = await Promise.all([coinsPromise, nftsPromise]);

      const topCoins = selectTopFarcasterCoins(coins);
      const topNfts = selectTopFarcasterNFTs(nfts);

      const coinItems = await runWithConcurrency(
        topCoins,
        async (balance) => {
          const address = balance.address.toLowerCase();
          const key = `${address}:${match.profile.fid}`;
          if (farcasterLoadedKeys.has(key)) return null;

          try {
            const response = await getCoin({
              address: address as `0x${string}`,
              chain: 8453,
            });
            const coin = response?.data?.zora20Token as CoinNode | undefined;
            if (!coin) return null;

            if (
              !isGnarsRelatedToken({
                address,
                name: coin.displayName || coin.name,
                symbol: coin.symbol,
              })
            ) {
              return null;
            }

            const item = mapFarcasterCoinToTVItem(coin, match.profile, balance);
            if (!item) return null;
            farcasterLoadedKeys.add(key);
            return item;
          } catch {
            return null;
          }
        },
        MAX_CONCURRENT_COIN_FETCHES,
      );

      const nftItems = topNfts
        .map((nft) => mapFarcasterNftToTVItem(nft, match.profile))
        .filter((item): item is TVItemData => item !== null);

      for (const item of coinItems) {
        if (item) {
          items.push(item);
          coinCount++;
        }
      }

      for (const item of nftItems) {
        items.push(item);
        nftCount++;
      }

      const creatorCoinItems = coinItems.filter(Boolean).length;
      const creatorNftItems = nftItems.length;
      if (creatorCoinItems === 0 && creatorNftItems === 0) {
        console.log("[farcaster-tv] Skipping creator (no eligible items):", {
          fid: match.profile.fid,
          username: match.profile.username,
          followerCount: match.profile.followerCount,
          coinsFetched: coins.length,
          nftsFetched: nfts.length,
          coinsAfterFilter: topCoins.length,
          nftsAfterFilter: topNfts.length,
        });
      } else {
        console.log("[farcaster-tv] Creator included:", {
          fid: match.profile.fid,
          username: match.profile.username,
          followerCount: match.profile.followerCount,
          coinsFetched: coins.length,
          nftsFetched: nfts.length,
          coinsAfterFilter: topCoins.length,
          nftsAfterFilter: topNfts.length,
          coinItems: creatorCoinItems,
          nftItems: creatorNftItems,
        });
      }
    },
    MAX_CONCURRENT_FARCASTER_FETCHES,
  );

  console.log(
    "[farcaster-tv] Final items:",
    items.map((item) => ({
      id: item.id,
      farcasterFid: item.farcasterFid ?? null,
      farcasterUsername: item.farcasterUsername ?? null,
      farcasterType: item.farcasterType ?? null,
      creator: item.creator,
      coinAddress: item.coinAddress ?? null,
    })),
  );

  return { items, stats: { creators: ranked.length, coins: coinCount, nfts: nftCount } };
}

const getCachedFarcasterTVPayload = unstable_cache(
  async (): Promise<FarcasterTVPayload> => {
    const start = Date.now();
    const qualifiedCreators = await fetchQualifiedCreators();
    const shouldFetchFarcaster = assertNeynarApiKey("farcaster-tv");

    const farcasterHoldingsPromise = shouldFetchFarcaster
      ? fetchFarcasterHoldings(qualifiedCreators)
      : null;

    const farcasterHoldings = farcasterHoldingsPromise
      ? await farcasterHoldingsPromise
      : { items: [], stats: { creators: 0, coins: 0, nfts: 0 } };

    const durationMs = Date.now() - start;

    return {
      qualifiedCreators,
      items: farcasterHoldings.items,
      stats: farcasterHoldings.stats,
      durationMs,
    };
  },
  ["farcaster-tv-aggregator", FARCASTER_TV_CACHE_KEY],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["farcaster-tv-aggregator"] },
);

/**
 * getFarcasterTVData()
 *
 * Caching strategy:
 * - React.cache() dedupes within a single request (server-cache-react).
 * - In-memory LRU caches across warm invocations for fast repeat hits (server-cache-lru).
 * - unstable_cache provides cross-request caching with a 15-minute revalidation window.
 */
export const getFarcasterTVData = reactCache(async (): Promise<FarcasterTVData> => {
  const callStart = Date.now();
  const lruHit = farcasterTvLru.get(FARCASTER_TV_CACHE_KEY);

  if (lruHit) {
    const elapsed = Date.now() - callStart;
    console.log(`[farcaster-tv] LRU hit in ${elapsed}ms`);
    return { ...lruHit, cache: { source: "lru" } };
  }

  const payload = await getCachedFarcasterTVPayload();
  farcasterTvLru.set(FARCASTER_TV_CACHE_KEY, payload);

  const elapsed = Date.now() - callStart;
  console.log(`[farcaster-tv] Cached fetch in ${elapsed}ms (build ${payload.durationMs}ms)`);

  return { ...payload, cache: { source: "next" } };
});

/**
 * Uncached debug helper for running the Farcaster TV aggregation outside Next.js.
 * Avoids unstable_cache/reactCache to allow script execution in Node.
 */
export async function getFarcasterTVDataUncached(): Promise<FarcasterTVData> {
  const start = Date.now();
  const qualifiedCreators = await fetchQualifiedCreators();
  const shouldFetchFarcaster = assertNeynarApiKey("farcaster-tv");

  const farcasterHoldings = shouldFetchFarcaster
    ? await fetchFarcasterHoldings(qualifiedCreators, false)
    : { items: [], stats: { creators: 0, coins: 0, nfts: 0 } };

  const durationMs = Date.now() - start;

  return {
    qualifiedCreators,
    items: farcasterHoldings.items,
    stats: farcasterHoldings.stats,
    durationMs,
    cache: { source: "next" },
  };
}
