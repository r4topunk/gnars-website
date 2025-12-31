"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCoin, setApiKey } from "@zoralabs/coins-sdk";
import type { TVItem, CoinNode } from "./types";
import { PRELOAD_THRESHOLD, FALLBACK_ITEMS, mapCoinToTVItem } from "./utils";

interface UseTVFeedOptions {
  priorityCoinAddress?: string;
}

// Creator profile for stickers
export interface CreatorCoinImage {
  coinAddress: string;
  imageUrl: string;
  symbol?: string;
}

interface APIFeedResponse {
  items: TVItem[];
  creators: Array<{
    handle: string;
    avatarUrl: string | null;
    coinBalance: number;
    nftBalance: number;
  }>;
  stats: {
    total: number;
    withVideo: number;
    withImage: number;
    gnarsPaired: number;
    droposals: number;
    creatorsCount: number;
  };
  fetchedAt: string;
  durationMs: number;
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
 * Data is fetched from /api/tv/feed which caches results for 1 hour.
 * Sources:
 * 1. GNARS-paired coins from subgraph (highest priority)
 * 2. Videos from qualified creators (300k+ coins AND 1+ NFT)
 * 3. Content from Gnars profile
 * 4. Droposals (NFT drops from DAO proposals)
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

        console.log("[gnars-tv] Fetching feed from API...");

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

        // Fetch from API (cached)
        const response = await fetch("/api/tv/feed");

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data: APIFeedResponse = await response.json();

        if (cancelled.current) return;

        console.log(
          `[gnars-tv] API returned ${data.items.length} items in ${data.durationMs}ms`
        );
        console.log(
          `[gnars-tv] Stats: ${data.stats.withVideo} videos, ${data.stats.gnarsPaired} GNARS-paired, ${data.stats.creatorsCount} creators`
        );

        // Build sticker images from creator avatars
        const coinImages: CreatorCoinImage[] = data.creators
          .filter((c) => c.avatarUrl)
          .map((c) => ({
            coinAddress: c.handle,
            imageUrl: c.avatarUrl!,
            symbol: c.handle,
          }));

        setCreatorCoinImages(coinImages);

        // Filter out priority coin if already in list
        let items = data.items;
        if (priorityItem?.coinAddress) {
          items = items.filter(
            (item) =>
              item.coinAddress?.toLowerCase() !==
              priorityItem!.coinAddress?.toLowerCase()
          );
        }

        // Add priority item at the top
        const finalItems = priorityItem ? [priorityItem, ...items] : items;

        // Track loaded addresses
        for (const item of finalItems) {
          if (item.coinAddress) {
            loadedCoinAddressesRef.current.add(item.coinAddress.toLowerCase());
          }
        }

        setRawItems(finalItems.length ? finalItems : FALLBACK_ITEMS);
        setHasMoreContent(false);
      } catch (err) {
        if (cancelled.current) return;
        console.error("[gnars-tv] Feed fetch error:", err);
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
