"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract, useWatchContractEvent } from "wagmi";
import { base } from "wagmi/chains";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";
import auctionAbi from "@/utils/abis/auctionAbi";

interface NewBidEvent {
  tokenId: bigint;
  bidder: `0x${string}`;
  amount: bigint;
  amountEth: string;
  extended: boolean;
  endTime: bigint;
}

interface UseAuctionLiveReturn {
  /** Signal: increments on every new bid detected */
  bidCount: number;
  /** The latest bid event (if any detected via events) */
  latestBid: NewBidEvent | undefined;
  /** Whether the connected wallet was just outbid */
  wasOutbid: boolean;
  /** Clear the outbid flag (after user acknowledges) */
  clearOutbid: () => void;
  /** Polled auction data as fallback */
  polledHighestBid: string | undefined;
  polledHighestBidder: `0x${string}` | undefined;
  polledEndTime: number | undefined;
}

export function useAuctionLive(
  currentTokenId: bigint | undefined,
): UseAuctionLiveReturn {
  const { address } = useAccount();
  const [bidCount, setBidCount] = useState(0);
  const [latestBid, setLatestBid] = useState<NewBidEvent | undefined>();
  const [wasOutbid, setWasOutbid] = useState(false);
  const previousBidderRef = useRef<string | undefined>(undefined);

  // Watch AuctionBid events
  useWatchContractEvent({
    address: DAO_ADDRESSES.auction as `0x${string}`,
    abi: auctionAbi,
    eventName: "AuctionBid",
    chainId: base.id,
    enabled: currentTokenId !== undefined,
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as {
          tokenId?: bigint;
          bidder?: `0x${string}`;
          amount?: bigint;
          extended?: boolean;
          endTime?: bigint;
        };
        if (!args.tokenId || !args.bidder || !args.amount) continue;
        // Only process bids for the current auction
        if (currentTokenId && args.tokenId !== currentTokenId) continue;

        const event: NewBidEvent = {
          tokenId: args.tokenId,
          bidder: args.bidder,
          amount: args.amount,
          amountEth: formatEther(args.amount),
          extended: args.extended ?? false,
          endTime: args.endTime ?? 0n,
        };

        // Check if connected user was outbid
        if (
          address &&
          previousBidderRef.current &&
          previousBidderRef.current.toLowerCase() === address.toLowerCase() &&
          args.bidder.toLowerCase() !== address.toLowerCase()
        ) {
          setWasOutbid(true);
        }

        previousBidderRef.current = args.bidder.toLowerCase();
        setLatestBid(event);
        setBidCount((c) => c + 1);
      }
    },
  });

  // Polling fallback: read auction() every 12s
  const { data: auctionData } = useReadContract({
    address: DAO_ADDRESSES.auction as `0x${string}`,
    abi: auctionAbi,
    functionName: "auction",
    chainId: CHAIN.id,
    query: {
      refetchInterval: 12_000,
      staleTime: 6_000,
    },
  });

  // Update previousBidderRef from polled data too
  useEffect(() => {
    if (auctionData) {
      const [, , bidder] = auctionData;
      if (bidder) {
        previousBidderRef.current = (bidder as string).toLowerCase();
      }
    }
  }, [auctionData]);

  const clearOutbid = useCallback(() => setWasOutbid(false), []);

  const polledHighestBid = auctionData
    ? formatEther(auctionData[1] as bigint)
    : undefined;
  const polledHighestBidder = auctionData
    ? (auctionData[2] as `0x${string}`)
    : undefined;
  const polledEndTime = auctionData
    ? Number(auctionData[4] as unknown as bigint)
    : undefined;

  return {
    bidCount,
    latestBid,
    wasOutbid,
    clearOutbid,
    polledHighestBid,
    polledHighestBidder,
    polledEndTime,
  };
}
