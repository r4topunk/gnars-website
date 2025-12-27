"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCoin,
  getCoinHolders,
  getProfile,
  getProfileCoins,
  setApiKey,
} from "@zoralabs/coins-sdk";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";
import type { TVItem, CoinNode, CoinEdge } from "./types";
import {
  INITIAL_COINS_PER_CREATOR,
  PRELOAD_THRESHOLD,
  FALLBACK_ITEMS,
  mapCoinToTVItem,
  mapDroposalToTVItem,
} from "./utils";
import { fetchDroposals } from "@/services/droposals";

// Gnars addresses
const GNARS_COIN_ADDRESS = "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b";
const GNARS_NFT_ADDRESS = "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17";
const GNARS_PROFILE_HANDLE = "gnars";

// Minimum requirements to be a qualified creator
const MIN_COIN_BALANCE = 300_000; // 300k Gnars coins
const MIN_NFT_BALANCE = 1; // At least 1 DAO NFT

// RPC client for checking NFT balances
// Uses Alchemy if available, otherwise falls back to public RPC
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

interface UseTVFeedOptions {
  priorityCoinAddress?: string;
}

// Zora SDK response types (not exported by SDK)
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

interface LinkedWalletNode {
  walletAddress?: string;
}

interface LinkedWalletEdge {
  node?: LinkedWalletNode;
}

interface ZoraProfileWithWallets {
  publicWallet?: {
    walletAddress?: string;
  };
  linkedWallets?: {
    edges?: LinkedWalletEdge[];
  };
}

// Creator profile for stickers
export interface CreatorCoinImage {
  coinAddress: string;
  imageUrl: string;
  symbol?: string;
}

interface QualifiedCreator {
  handle: string;
  avatarUrl: string | null;
  coinBalance: number;
  nftBalance: number;
  wallets: string[];
}

interface UseTVFeedReturn {
  items: TVItem[];
  creatorCoinImages: CreatorCoinImage[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMoreContent: boolean;
  loadMore: () => void;
}

/**
 * Fetch qualified creators - holders with both Gnars coin AND DAO NFT
 */
async function fetchQualifiedCreators(): Promise<QualifiedCreator[]> {
  console.log("[gnars-tv] Fetching Gnars coin holders...");

  const qualifiedCreators: QualifiedCreator[] = [];
  const seenHandles = new Set<string>();

  let cursor: string | undefined;
  let page = 1;

  // Fetch coin holders (paginated)
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

        // Parse coin balance
        const rawBalance = node.balance || "0";
        const balanceNum = Number(BigInt(rawBalance)) / 1e18;

        // Skip if below minimum coin balance
        if (balanceNum < MIN_COIN_BALANCE) continue;

        // Get all linked wallets for this profile
        try {
          const profileResult = await getProfile({ identifier: handle });
          const fullProfile = profileResult?.data?.profile;
          if (!fullProfile) continue;

          const wallets: string[] = [];

          // Public wallet
          if (fullProfile.publicWallet?.walletAddress) {
            wallets.push(fullProfile.publicWallet.walletAddress.toLowerCase());
          }

          // Linked wallets
          const profileWithWallets = fullProfile as ZoraProfileWithWallets;
          const linkedEdges = profileWithWallets.linkedWallets?.edges || [];
          for (const linkedEdge of linkedEdges) {
            const addr = linkedEdge.node?.walletAddress?.toLowerCase();
            if (addr && !wallets.includes(addr)) {
              wallets.push(addr);
            }
          }

          // Check NFT balance across all wallets
          let totalNfts = 0;
          for (const wallet of wallets) {
            try {
              const nftBalance = await viemClient.readContract({
                address: GNARS_NFT_ADDRESS as `0x${string}`,
                abi: erc721Abi,
                functionName: "balanceOf",
                args: [wallet as `0x${string}`],
              });
              totalNfts += Number(nftBalance);
            } catch {
              // Skip on error
            }
          }

          // Only include if has minimum NFTs
          if (totalNfts >= MIN_NFT_BALANCE) {
            const avatarUrl =
              profile?.avatar?.previewImage?.medium ||
              profile?.avatar?.previewImage?.small ||
              null;

            qualifiedCreators.push({
              handle,
              avatarUrl,
              coinBalance: balanceNum,
              nftBalance: totalNfts,
              wallets,
            });

            console.log(
              `[gnars-tv] Qualified creator: ${handle} (${balanceNum.toFixed(0)} coins, ${totalNfts} NFTs)`
            );
          }
        } catch (err) {
          console.warn(`[gnars-tv] Failed to check profile ${handle}:`, err);
        }
      }

      if (!pageInfo?.hasNextPage) break;
      cursor = pageInfo.endCursor;
      page++;
    } catch (err) {
      console.warn("[gnars-tv] Failed to fetch coin holders page:", err);
      break;
    }
  }

  console.log(`[gnars-tv] Found ${qualifiedCreators.length} qualified creators`);
  return qualifiedCreators;
}

/**
 * Hook to fetch and manage TV feed content
 *
 * Data sources:
 * 1. Videos from qualified creators (300k+ coins AND 1+ NFT)
 * 2. Droposals (NFT drops from DAO proposals)
 */
export function useTVFeed({
  priorityCoinAddress,
}: UseTVFeedOptions): UseTVFeedReturn {
  const [rawItems, setRawItems] = useState<TVItem[]>([]);
  const [creatorCoinImages, setCreatorCoinImages] = useState<CreatorCoinImage[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreContent, setHasMoreContent] = useState(false);

  // Track already loaded coin addresses to prevent duplicates
  const loadedCoinAddressesRef = useRef<Set<string>>(new Set());

  const normalizedPriority = priorityCoinAddress?.toLowerCase();

  useEffect(() => {
    const cancelled = { current: false };

    const loadData = async () => {
      try {
        setLoading(true);
        loadedCoinAddressesRef.current = new Set();
        setError(null);

        if (process.env.NEXT_PUBLIC_ZORA_API_KEY) {
          setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY);
        }

        // Fetch priority coin directly if provided
        let priorityItem: TVItem | null = null;
        if (normalizedPriority) {
          try {
            const response = await getCoin({
              address: normalizedPriority as `0x${string}`,
              chain: 8453,
            });
            const coin = response?.data?.zora20Token as CoinNode | undefined;
            if (coin) {
              priorityItem = mapCoinToTVItem(
                coin,
                0,
                coin?.creatorProfile?.handle || normalizedPriority
              );
              if (priorityItem?.coinAddress) {
                loadedCoinAddressesRef.current.add(
                  priorityItem.coinAddress.toLowerCase()
                );
              }
            }
          } catch (err) {
            console.error("[gnars-tv] Failed to fetch priority coin", {
              coinAddress: normalizedPriority,
              error: err,
            });
          }
        }

        // Fetch data in parallel
        const [qualifiedCreators, droposalItems, gnarsProfileItems] = await Promise.all([
          // 1. Fetch qualified creators (coin + NFT holders)
          fetchQualifiedCreators().catch((err) => {
            console.warn("[gnars-tv] Failed to fetch qualified creators:", err);
            return [] as QualifiedCreator[];
          }),

          // 2. Fetch droposals
          fetchDroposals(50)
            .then((droposals) =>
              droposals
                .map(mapDroposalToTVItem)
                .filter((item): item is TVItem => item !== null)
            )
            .catch(() => [] as TVItem[]),

          // 3. Fetch content from Gnars profile
          (async () => {
            try {
              const response = await getProfileCoins({
                identifier: GNARS_PROFILE_HANDLE,
                count: 50,
              });
              const edges = (response?.data?.profile?.createdCoins?.edges ||
                []) as CoinEdge[];
              return edges
                .map((edge) => {
                  const node = edge?.node;
                  if (!node) return null;
                  const coin = ("coin" in node ? node.coin : node) as
                    | CoinNode
                    | undefined;
                  if (!coin) return null;

                  const addr = (coin.address || coin.contract)?.toLowerCase();
                  if (addr && loadedCoinAddressesRef.current.has(addr))
                    return null;

                  const item = mapCoinToTVItem(coin as CoinNode, 0, GNARS_PROFILE_HANDLE);
                  if (item && addr) {
                    loadedCoinAddressesRef.current.add(addr);
                  }
                  return item;
                })
                .filter((item): item is TVItem => item !== null);
            } catch (err) {
              console.warn("[gnars-tv] Failed to fetch Gnars profile content:", err);
              return [] as TVItem[];
            }
          })(),
        ]);

        if (cancelled.current) return;

        // Build sticker images from qualified creators' avatars
        const coinImages: CreatorCoinImage[] = qualifiedCreators
          .filter((c) => c.avatarUrl)
          .map((c) => ({
            coinAddress: c.handle, // Use handle as identifier
            imageUrl: c.avatarUrl!,
            symbol: c.handle,
          }));

        console.log(
          "[gnars-tv] Creator avatars for stickers:",
          coinImages.map((c) => c.symbol).join(", ")
        );
        setCreatorCoinImages(coinImages);

        // Fetch videos from each qualified creator
        const creatorHandles = qualifiedCreators.map((c) => c.handle);
        console.log("[gnars-tv] Fetching content from creators:", creatorHandles.join(", "));

        const creatorVideosPromises = creatorHandles.map(
          async (creatorIdentifier) => {
            try {
              const response = await getProfileCoins({
                identifier: creatorIdentifier,
                count: INITIAL_COINS_PER_CREATOR,
              });

              const edges = (response?.data?.profile?.createdCoins?.edges ||
                []) as CoinEdge[];

              return edges
                .map((edge) => {
                  const node = edge?.node;
                  if (!node) return null;
                  const coin = ("coin" in node ? node.coin : node) as
                    | CoinNode
                    | undefined;
                  if (!coin) return null;

                  const addr = (coin.address || coin.contract)?.toLowerCase();
                  if (addr && loadedCoinAddressesRef.current.has(addr))
                    return null;

                  const item = mapCoinToTVItem(
                    coin as CoinNode,
                    0,
                    creatorIdentifier
                  );
                  if (item && addr) {
                    loadedCoinAddressesRef.current.add(addr);
                  }
                  return item;
                })
                .filter((item): item is TVItem => item !== null);
            } catch (err) {
              console.warn(
                `[gnars-tv] Failed to fetch coins for creator ${creatorIdentifier}:`,
                err
              );
              return [];
            }
          }
        );

        const creatorVideosResults = await Promise.all(creatorVideosPromises);
        const creatorVideos = creatorVideosResults.flat();

        if (cancelled.current) return;

        // Combine all video sources
        const allItems = [...creatorVideos, ...gnarsProfileItems, ...droposalItems];

        console.log(
          `[gnars-tv] Content sources: ${creatorVideos.length} from creators, ${gnarsProfileItems.length} from Gnars profile, ${droposalItems.length} from droposals`
        );

        // Sort by createdAt (newest first)
        const sortedItems = allItems.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        // Pin priority item to the top
        const finalItems = priorityItem
          ? [priorityItem, ...sortedItems]
          : sortedItems;

        console.log(`[gnars-tv] Total items: ${finalItems.length}`);
        setRawItems(finalItems.length ? finalItems : FALLBACK_ITEMS);
        setHasMoreContent(false);
      } catch {
        if (cancelled.current) return;
        setError("Unable to load videos right now");
        setRawItems(FALLBACK_ITEMS);
      } finally {
        if (!cancelled.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled.current = true;
    };
  }, [normalizedPriority]);

  const loadMore = useCallback(() => {
    // No pagination implemented yet
  }, []);

  return {
    items: rawItems,
    creatorCoinImages,
    loading,
    loadingMore,
    error,
    hasMoreContent,
    loadMore,
  };
}

/**
 * Hook to handle preloading when approaching end of feed
 */
export function usePreloadTrigger(
  activeIndex: number,
  totalItems: number,
  hasMoreContent: boolean,
  loadingMore: boolean,
  loading: boolean,
  loadMore: () => void
) {
  useEffect(() => {
    if (!totalItems || loading) return;

    const remainingVideos = totalItems - activeIndex - 1;
    if (remainingVideos <= PRELOAD_THRESHOLD && hasMoreContent && !loadingMore) {
      loadMore();
    }
  }, [activeIndex, totalItems, hasMoreContent, loadingMore, loading, loadMore]);
}
