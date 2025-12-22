"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCoin, getProfileBalances, getProfileCoins, setApiKey } from "@zoralabs/coins-sdk";
import type { TVItem, CoinNode, CoinEdge, BalanceEdge } from "./types";
import {
  GNARS_ZORA_HANDLE,
  INITIAL_COINS_PER_CREATOR,
  PRELOAD_THRESHOLD,
  FALLBACK_ITEMS,
  mapCoinToTVItem,
  mapDroposalToTVItem,
} from "./utils";
import { fetchDroposals } from "@/services/droposals";

interface UseTVFeedOptions {
  priorityCoinAddress?: string;
}

// Creator coin image for stickers
export interface CreatorCoinImage {
  coinAddress: string;
  imageUrl: string;
  symbol?: string;
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
 * Hook to fetch and manage TV feed content
 *
 * Data sources:
 * 1. Coins with video that Gnars Treasury holds
 * 2. Videos from creators whose creator coins Gnars holds
 * 3. Droposals (NFT drops from DAO proposals)
 */
export function useTVFeed({ priorityCoinAddress }: UseTVFeedOptions): UseTVFeedReturn {
  const [rawItems, setRawItems] = useState<TVItem[]>([]);
  const [creatorCoinImages, setCreatorCoinImages] = useState<CreatorCoinImage[]>([]);
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
                coin?.creatorProfile?.handle || normalizedPriority,
              );
              if (priorityItem?.coinAddress) {
                loadedCoinAddressesRef.current.add(priorityItem.coinAddress.toLowerCase());
              }
            }
          } catch (err) {
            console.error("[gnars-tv] Failed to fetch priority coin", {
              coinAddress: normalizedPriority,
              error: err,
            });
          }
        }

        // Fetch all data in parallel
        const [gnarsBalancesResult, droposalItems] = await Promise.all([
          // 1. Fetch Gnars profile holdings (using handle, not treasury address)
          getProfileBalances({
            identifier: GNARS_ZORA_HANDLE,
            count: 100,
            chainIds: [8453],
          }).catch((err) => {
            console.warn("[gnars-tv] Failed to fetch Gnars balances:", err);
            return null;
          }),

          // 2. Fetch droposals
          fetchDroposals(50)
            .then((droposals) =>
              droposals
                .map(mapDroposalToTVItem)
                .filter((item): item is TVItem => item !== null)
            )
            .catch(() => [] as TVItem[]),
        ]);

        if (cancelled.current) return;

        // Process Gnars holdings
        const balanceEdges = (gnarsBalancesResult?.data?.profile?.coinBalances?.edges || []) as BalanceEdge[];

        // Separate into: video coins, creator handles, and coin images for stickers
        // Creator coins typically have symbol matching the handle (e.g., "skatehacker", "zimardrp")
        const videoCoinsFromHoldings: TVItem[] = [];
        const creatorHandles: string[] = [];
        const coinImages: CreatorCoinImage[] = [];

        console.log("[gnars-tv] Processing", balanceEdges.length, "balance edges");

        for (const edge of balanceEdges) {
          const coin = edge.node?.coin;
          if (!coin) continue;

          const coinAddress = coin.address?.toLowerCase();
          if (!coinAddress || loadedCoinAddressesRef.current.has(coinAddress)) continue;

          // Extract coin image for stickers (profile image of the creator coin)
          const coinMedia = coin.mediaContent || coin.media;
          const coinPreviewImage = coinMedia?.previewImage;

          // Try multiple sources for the image
          const creatorAvatar = coin.creatorProfile?.avatar?.previewImage;
          const creatorAvatarUrl = typeof creatorAvatar === 'object'
            ? creatorAvatar?.medium || creatorAvatar?.small || creatorAvatar?.url
            : creatorAvatar;

          const coinImageUrl =
            (typeof coinPreviewImage === 'object'
              ? coinPreviewImage?.medium || coinPreviewImage?.small || coinPreviewImage?.url
              : coinPreviewImage) ||
            coinMedia?.previewUrl ||
            coinMedia?.image ||
            coin.imageUrl ||
            creatorAvatarUrl; // Fallback to creator avatar

          console.log("[gnars-tv] Coin:", coin.symbol, "imageUrl:", coinImageUrl ? "found" : "NOT FOUND", {
            coinImageUrl,
            hasMediaContent: !!coinMedia,
            hasCreatorAvatar: !!creatorAvatarUrl,
            rawImageUrl: coin.imageUrl,
          });

          if (coinImageUrl) {
            // Convert IPFS URLs to HTTP
            const httpImageUrl = coinImageUrl.startsWith('ipfs://')
              ? coinImageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
              : coinImageUrl;

            coinImages.push({
              coinAddress,
              imageUrl: httpImageUrl,
              symbol: coin.symbol,
            });
          }

          // Check if this coin has video content
          const tvItem = mapCoinToTVItem(coin, 0, coin.creatorProfile?.handle || coinAddress);
          if (tvItem) {
            videoCoinsFromHoldings.push(tvItem);
            loadedCoinAddressesRef.current.add(coinAddress);
          }

          // Use symbol as creator handle for creator coins
          // Creator coins have symbol = handle (e.g., "skatehacker", "zimardrp", "willdias")
          const symbol = coin.symbol?.toLowerCase();
          if (symbol && !creatorHandles.includes(symbol)) {
            creatorHandles.push(symbol);
          }
        }

        // Store creator coin images for stickers
        console.log("[gnars-tv] Total creator coin images collected:", coinImages.length, coinImages.map(c => c.symbol).join(", "));
        setCreatorCoinImages(coinImages);

        // Fetch videos from creators whose creator coins Gnars holds
        const creatorVideosPromises = creatorHandles.map(async (creatorIdentifier) => {
          try {
            const response = await getProfileCoins({
              identifier: creatorIdentifier,
              count: INITIAL_COINS_PER_CREATOR,
            });

            const edges = (response?.data?.profile?.createdCoins?.edges || []) as CoinEdge[];

            return edges
              .map((edge) => {
                const node = edge?.node;
                if (!node) return null;
                const coin = ("coin" in node ? node.coin : node) as CoinNode | undefined;
                if (!coin) return null;

                const addr = (coin.address || coin.contract)?.toLowerCase();
                if (addr && loadedCoinAddressesRef.current.has(addr)) return null;

                const item = mapCoinToTVItem(coin as CoinNode, 0, creatorIdentifier);
                if (item && addr) {
                  loadedCoinAddressesRef.current.add(addr);
                }
                return item;
              })
              .filter((item): item is TVItem => item !== null);
          } catch (err) {
            console.warn(`[gnars-tv] Failed to fetch coins for creator ${creatorIdentifier}:`, err);
            return [];
          }
        });

        const creatorVideosResults = await Promise.all(creatorVideosPromises);
        const creatorVideos = creatorVideosResults.flat();

        if (cancelled.current) return;

        // Combine all video sources (coins + droposals)
        const allItems = [...videoCoinsFromHoldings, ...creatorVideos, ...droposalItems];

        // Sort by createdAt (newest first)
        const sortedItems = allItems.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA; // Descending (newest first)
        });

        // Pin priority item to the top
        const finalItems = priorityItem ? [priorityItem, ...sortedItems] : sortedItems;

        setRawItems(finalItems.length ? finalItems : FALLBACK_ITEMS);
        setHasMoreContent(false); // No pagination for now
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
    // No pagination implemented for the new data sources yet
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
  loadMore: () => void,
) {
  useEffect(() => {
    if (!totalItems || loading) return;

    const remainingVideos = totalItems - activeIndex - 1;
    if (remainingVideos <= PRELOAD_THRESHOLD && hasMoreContent && !loadingMore) {
      loadMore();
    }
  }, [activeIndex, totalItems, hasMoreContent, loadingMore, loading, loadMore]);
}
