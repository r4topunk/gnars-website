"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCoin, getProfileCoins, setApiKey } from "@zoralabs/coins-sdk";
import type { TVItem, CoinNode, CoinEdge, CreatorCursor } from "./types";
import {
  CREATOR_ADDRESSES,
  INITIAL_COINS_PER_CREATOR,
  LOAD_MORE_COINS_PER_CREATOR,
  PRELOAD_THRESHOLD,
  FALLBACK_ITEMS,
  mapCoinToTVItem,
  mapDroposalToTVItem,
  sortByPriority,
  shuffleArray,
} from "./utils";
import { fetchDroposals } from "@/services/droposals";

interface UseTVFeedOptions {
  priorityCoinAddress?: string;
}

interface UseTVFeedReturn {
  items: TVItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMoreContent: boolean;
  loadMore: () => void;
}

/**
 * Hook to fetch and manage TV feed content from Zora coins
 */
export function useTVFeed({ priorityCoinAddress }: UseTVFeedOptions): UseTVFeedReturn {
  const [rawItems, setRawItems] = useState<TVItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreContent, setHasMoreContent] = useState(true);

  // Track pagination cursors per creator
  const creatorCursorsRef = useRef<Map<string, CreatorCursor>>(new Map());
  // Track already loaded coin addresses to prevent duplicates
  const loadedCoinAddressesRef = useRef<Set<string>>(new Set());
  // Ref to call loadData from outside the effect
  const loadDataRef = useRef<((isLoadMore?: boolean) => Promise<void>) | null>(null);

  const normalizedPriority = priorityCoinAddress?.toLowerCase();

  useEffect(() => {
    const cancelled = { current: false };

    const loadData = async (isLoadMore = false) => {
      try {
        if (isLoadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          // Reset pagination state on fresh load
          creatorCursorsRef.current = new Map();
          loadedCoinAddressesRef.current = new Set();
        }
        setError(null);

        if (process.env.NEXT_PUBLIC_ZORA_API_KEY) {
          setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY);
        }

        const coinsPerCreator = isLoadMore
          ? LOAD_MORE_COINS_PER_CREATOR
          : INITIAL_COINS_PER_CREATOR;

        // Fetch priority coin directly if provided
        let priorityItem: TVItem | null = null;
        if (normalizedPriority && !isLoadMore) {
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
            // If priority coin fetch fails, fall back to the normal feed.
            // Log with context so the failure is observable in production.
            console.error("[gnars-tv] Failed to fetch priority coin", {
              coinAddress: normalizedPriority,
              chainId: 8453,
              isLoadMore,
              error: err,
            });
          }
        }

        let creatorsWithMoreContent = 0;

        // Fetch droposals in parallel with coins (only on initial load)
        const droposalItemsPromise = !isLoadMore
          ? fetchDroposals(50)
              .then((droposals) =>
                droposals
                  .map(mapDroposalToTVItem)
                  .filter((item): item is TVItem => item !== null)
              )
              .catch(() => {
                return [] as TVItem[];
              })
          : Promise.resolve([] as TVItem[]);

        const [results, droposalItems] = await Promise.all([
          Promise.all(
            CREATOR_ADDRESSES.map(async (creatorAddress) => {
            const cursorInfo = creatorCursorsRef.current.get(creatorAddress);
            if (cursorInfo && !cursorInfo.hasMore) {
              return [] as TVItem[];
            }

            try {
              const response = await getProfileCoins({
                identifier: creatorAddress,
                count: coinsPerCreator,
                ...(cursorInfo?.cursor ? { after: cursorInfo.cursor } : {}),
              });

              const createdCoins = response?.data?.profile?.createdCoins;
              const edges: CoinEdge[] = (createdCoins?.edges as CoinEdge[]) || [];
              const pageInfo = createdCoins?.pageInfo as
                | { endCursor?: string; hasNextPage?: boolean }
                | undefined;

              const hasNextPage = pageInfo?.hasNextPage ?? edges.length >= coinsPerCreator;

              creatorCursorsRef.current.set(creatorAddress, {
                cursor: pageInfo?.endCursor || null,
                hasMore: hasNextPage,
                error: undefined,
                lastErrorAt: undefined,
              });

              if (hasNextPage) {
                creatorsWithMoreContent++;
              }

              const coins = edges
                .map((edge) => {
                  const node = edge?.node;
                  if (!node) return null;
                  return "coin" in node ? node.coin : node;
                })
                .filter((coin): coin is CoinNode => coin !== null);

              const videoItemsForCreator = coins
                .map((coin, idx) => mapCoinToTVItem(coin, idx, creatorAddress))
                .filter((item): item is TVItem => {
                  if (!item) return false;
                  const addr = item.coinAddress?.toLowerCase();
                  if (addr && loadedCoinAddressesRef.current.has(addr)) {
                    return false;
                  }
                  if (addr) {
                    loadedCoinAddressesRef.current.add(addr);
                  }
                  return true;
                });

              return videoItemsForCreator;
            } catch (err) {
              // In development, creator fetch failures are common (rate limits, empty profiles)
              // Log as warning in dev, error in production for monitoring
              const logLevel = process.env.NODE_ENV === "production" ? "error" : "warn";
              const errorMsg = err instanceof Error ? err.message : String(err);
              console[logLevel](`[gnars-tv] Failed to fetch coins for creator ${creatorAddress}:`, errorMsg);

              const existing = creatorCursorsRef.current.get(creatorAddress);
              // Don't retry if we failed recently (within last 60 seconds)
              const shouldAllowRetry = !existing?.lastErrorAt || 
                                       (Date.now() - existing.lastErrorAt > 60000);
              
              creatorCursorsRef.current.set(creatorAddress, {
                cursor: existing?.cursor ?? null,
                hasMore: shouldAllowRetry ? (existing?.hasMore ?? false) : false,
                error: err instanceof Error ? err.message : String(err),
                lastErrorAt: Date.now(),
              });
              return [] as TVItem[];
            }
          }),
          ),
          droposalItemsPromise,
        ]);

        if (cancelled.current) return;

        setHasMoreContent(creatorsWithMoreContent > 0);

        const flattened = results.flat().filter(Boolean);

        // Remove priority item from rest to avoid duplicates
        let rest = flattened;
        if (priorityItem) {
          rest = flattened.filter(
            (item) => item.coinAddress?.toLowerCase() !== normalizedPriority,
          );
        }

        // Sort coins by priority and interleave
        const sortedCoins = sortByPriority(rest);

        // Merge droposals with coins: shuffle droposals and interleave randomly
        let combined: TVItem[];
        if (droposalItems.length > 0 && !isLoadMore) {
          // Shuffle droposals for variety
          const shuffledDroposals = shuffleArray(droposalItems);
          // Interleave droposals into the coin feed at regular intervals
          combined = [];
          const interval = Math.max(3, Math.floor(sortedCoins.length / shuffledDroposals.length));
          let droposalIndex = 0;
          for (let i = 0; i < sortedCoins.length; i++) {
            combined.push(sortedCoins[i]);
            // Insert a droposal every `interval` items
            if ((i + 1) % interval === 0 && droposalIndex < shuffledDroposals.length) {
              combined.push(shuffledDroposals[droposalIndex]);
              droposalIndex++;
            }
          }
          // Append remaining droposals at the end
          while (droposalIndex < shuffledDroposals.length) {
            combined.push(shuffledDroposals[droposalIndex]);
            droposalIndex++;
          }
        } else {
          combined = sortedCoins;
        }

        // Reverse to show latest videos first
        combined.reverse();

        // Pin priority item to the top (only on initial load)
        const finalItems = priorityItem && !isLoadMore ? [priorityItem, ...combined] : combined;

        if (isLoadMore) {
          setRawItems((prev) => [...prev, ...finalItems]);
        } else {
          setRawItems(finalItems.length ? finalItems : FALLBACK_ITEMS);
        }
      } catch {
        if (cancelled.current) return;
        if (!isLoadMore) {
          setError("Unable to load videos right now");
          setRawItems(FALLBACK_ITEMS);
        }
      } finally {
        if (!cancelled.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    loadDataRef.current = loadData;
    loadData();

    return () => {
      cancelled.current = true;
    };
  }, [normalizedPriority]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMoreContent || !loadDataRef.current) return;
    loadDataRef.current(true);
  }, [loadingMore, hasMoreContent]);

  // Compute sorted items with priority coin at top
  const items = rawItems;

  return {
    items,
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
