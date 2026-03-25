// src/hooks/use-auction-bids.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GNARS_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";

const AUCTION_BIDS_QUERY = `
  query GetAuctionBids($auctionId: String!) {
    auctionBids(
      where: { auction: $auctionId }
      orderBy: bidTime
      orderDirection: desc
      first: 100
    ) {
      id
      bidder
      amount
      bidTime
      transactionHash
    }
  }
`;

export interface AuctionBid {
  id: string;
  bidder: string;
  amount: string;
  bidTime: string;
  transactionHash: string;
}

interface UseAuctionBidsResult {
  bids: AuctionBid[];
  isLoading: boolean;
  error: string | null;
  newBidIds: Set<string>;
}

export function useAuctionBids(
  tokenId: string | undefined,
  enabled: boolean,
  pollIntervalMs = 10_000,
): UseAuctionBidsResult {
  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newBidIds, setNewBidIds] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());
  const isFirstFetch = useRef(true);

  const fetchBids = useCallback(async () => {
    if (!tokenId) return;

    try {
      if (isFirstFetch.current) setIsLoading(true);

      const auctionId = `${GNARS_ADDRESSES.token}:${tokenId}`;
      const data = await subgraphQuery<{ auctionBids: AuctionBid[] }>(
        AUCTION_BIDS_QUERY,
        { auctionId },
      );

      const fetched = data.auctionBids ?? [];
      setBids(fetched);

      // Track new bids (not on first load)
      if (!isFirstFetch.current) {
        const incoming = new Set<string>();
        for (const bid of fetched) {
          if (!knownIds.current.has(bid.id)) {
            incoming.add(bid.id);
          }
        }
        if (incoming.size > 0) {
          setNewBidIds(incoming);
          // Clear highlight after 3s
          setTimeout(() => setNewBidIds(new Set()), 3000);
        }
      }

      // Update known IDs
      knownIds.current = new Set(fetched.map((b) => b.id));
      isFirstFetch.current = false;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bids");
    } finally {
      setIsLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    if (!enabled || !tokenId) return;

    isFirstFetch.current = true;
    knownIds.current = new Set();
    fetchBids();

    const interval = setInterval(fetchBids, pollIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, tokenId, fetchBids, pollIntervalMs]);

  return { bids, isLoading, error, newBidIds };
}
