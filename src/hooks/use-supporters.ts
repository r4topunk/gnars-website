"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Address } from 'viem';

export interface AggregatedHolder {
  address: string;
  tokenCount: number;
  tokenIds: bigint[];
}

interface SupportersApiResponse {
  supporters: { address: string; tokenCount: number; tokenIds: string[] }[];
  totalSupply: string;
  hasMore: boolean;
  nextTokenId: string;
  cached: boolean;
}

export interface UseSupportersOptions {
  contractAddress?: Address | null;
  totalSupply?: bigint | null;
  batchSize?: number; // how many tokenIds to scan per request
  itemsPerPage?: number; // how many supporters to show initially
  autoLoad?: boolean;
}

export interface UseSupportersResult {
  supporters: AggregatedHolder[];
  visibleSupporters: AggregatedHolder[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  cached: boolean;
}

export function useSupporters({
  contractAddress,
  totalSupply,
  batchSize = 100,
  itemsPerPage = 24,
  autoLoad = true,
}: UseSupportersOptions): UseSupportersResult {
  const [supporters, setSupporters] = useState<AggregatedHolder[]>([]);
  const [visibleSupporters, setVisibleSupporters] = useState<AggregatedHolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextTokenId, setNextTokenId] = useState<bigint>(1n);
  const [cached, setCached] = useState(false);
  const [visibleCount, setVisibleCount] = useState(itemsPerPage);

  const loadedKey = useRef<string | null>(null);

  const canLoad = useMemo(() => Boolean(contractAddress) && totalSupply !== undefined && totalSupply !== null, [contractAddress, totalSupply]);

  useEffect(() => {
    if (!autoLoad || !canLoad) return;
    const key = `${contractAddress}-${totalSupply}`;
    if (loadedKey.current === key) return;
    loadedKey.current = key;

    const initialBatchEnd = totalSupply && totalSupply > 0n
      ? (totalSupply < BigInt(batchSize) ? totalSupply : BigInt(batchSize))
      : BigInt(batchSize);

    const fetchInitial = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const params = new URLSearchParams({
          contractAddress: contractAddress!,
          startTokenId: '1',
          endTokenId: initialBatchEnd.toString(),
        });
        const res = await fetch(`/api/supporters?${params.toString()}`);
        if (!res.ok) throw new Error(`Failed to fetch supporters: ${res.statusText}`);
        const api: SupportersApiResponse = await res.json();
        const mapped: AggregatedHolder[] = api.supporters.map(s => ({
          address: s.address,
          tokenCount: s.tokenCount,
          tokenIds: s.tokenIds.map(id => BigInt(id)),
        }));
        setSupporters(mapped);
        setVisibleSupporters(mapped.slice(0, itemsPerPage));
        setVisibleCount(itemsPerPage);
        setHasMore(api.hasMore);
        setNextTokenId(BigInt(api.nextTokenId));
        setCached(Boolean(api.cached));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch supporters');
        loadedKey.current = null; // allow retry on change
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitial();
  }, [autoLoad, canLoad, contractAddress, totalSupply, batchSize, itemsPerPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !contractAddress || isLoadingMore) return;
    try {
      setIsLoadingMore(true);
      const end = totalSupply && totalSupply > 0n
        ? (nextTokenId + BigInt(batchSize) - 1n > totalSupply ? totalSupply : nextTokenId + BigInt(batchSize) - 1n)
        : nextTokenId + BigInt(batchSize) - 1n;
      const params = new URLSearchParams({
        contractAddress,
        startTokenId: nextTokenId.toString(),
        endTokenId: end.toString(),
      });
      const res = await fetch(`/api/supporters?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch supporters: ${res.statusText}`);
      const api: SupportersApiResponse = await res.json();
      const newBatch: AggregatedHolder[] = api.supporters.map(s => ({
        address: s.address,
        tokenCount: s.tokenCount,
        tokenIds: s.tokenIds.map(id => BigInt(id)),
      }));

      // Merge by re-aggregating tokenIds across batches
      setSupporters(prev => {
        const allTokenEntries = [
          ...prev.flatMap(s => s.tokenIds.map(tokenId => ({ address: s.address, tokenId }))),
          ...newBatch.flatMap(s => s.tokenIds.map(tokenId => ({ address: s.address, tokenId }))),
        ];
        const map = new Map<string, { count: number; tokens: bigint[] }>();
        for (const { address, tokenId } of allTokenEntries) {
          const entry = map.get(address) ?? { count: 0, tokens: [] };
          entry.count += 1;
          entry.tokens.push(tokenId);
          map.set(address, entry);
        }
        const merged = Array.from(map.entries())
          .map(([address, v]) => ({ address, tokenCount: v.count, tokenIds: v.tokens }))
          .sort((a, b) => b.tokenCount - a.tokenCount);
        setVisibleSupporters(merged.slice(0, visibleCount));
        return merged;
      });

      setHasMore(api.hasMore);
      setNextTokenId(BigInt(api.nextTokenId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more supporters');
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, contractAddress, isLoadingMore, totalSupply, nextTokenId, batchSize, visibleCount]);

  return {
    supporters,
    visibleSupporters,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    cached,
  };
}


