"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDaoAuction } from "@buildeross/hooks";
import { toast } from "sonner";
import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import { AuctionBidForm } from "@/components/auction/AuctionBidForm";
import { AuctionLiveStatus } from "@/components/auction/AuctionLiveStatus";
import { AuctionSettleButton } from "@/components/auction/AuctionSettleButton";
import { BidHistoryModal } from "@/components/auction/BidHistoryModal";
import { GnarImageTile } from "@/components/auctions/GnarImageTile";
import { Card, CardContent } from "@/components/ui/card";
import { useAuctionBids } from "@/hooks/use-auction-bids";
import { useAuctionLive } from "@/hooks/use-auction-live";
import { useBidComments } from "@/hooks/use-bid-comments";
import { useUserAddress } from "@/hooks/use-user-address";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";
import auctionAbi from "@/utils/abis/auctionAbi";

export function AuctionSpotlight() {
  const { address } = useUserAddress();
  const [isBidHistoryOpen, setIsBidHistoryOpen] = useState(false);

  // Optimistic state — shown immediately after user's TX is submitted
  const [optimistic, setOptimistic] = useState<{
    comment: string;
    bidAmount: string;
  } | null>(null);
  const bidsCountWhenOptimisticRef = useRef<number>(0);

  // Primary auction data (metadata, tokenUri)
  const { highestBid, highestBidder, endTime, startTime, tokenId, tokenUri } = useDaoAuction({
    collectionAddress: DAO_ADDRESSES.token,
    auctionAddress: DAO_ADDRESSES.auction,
    chainId: CHAIN.id,
  });

  // Live updates (event subscription + polling fallback)
  const auctionLive = useAuctionLive(tokenId ? BigInt(tokenId) : undefined);

  // Use live data when available, fall back to SDK data
  const displayBid = auctionLive.polledHighestBid ?? highestBid;
  const displayBidder = auctionLive.polledHighestBidder ?? highestBidder;
  const displayEndTime = auctionLive.polledEndTime ?? endTime;

  // Fetch bids for this auction (always enabled — lightweight subgraph query)
  const { bids } = useAuctionBids(tokenId?.toString(), true, 15_000);

  // Clear optimistic state once subgraph has indexed the new bid
  useEffect(() => {
    if (optimistic && bids.length > bidsCountWhenOptimisticRef.current) {
      setOptimistic(null);
    }
  }, [bids.length, optimistic]);

  // Fetch comment for the leading bid
  const leadingBidTxHash = bids.length > 0 ? bids[0].transactionHash : undefined;
  const txHashes = useMemo(() => (leadingBidTxHash ? [leadingBidTxHash] : []), [leadingBidTxHash]);
  const { comments } = useBidComments(txHashes);
  const fetchedComment = leadingBidTxHash
    ? (comments.get(leadingBidTxHash) ?? undefined)
    : undefined;

  // Use optimistic comment until real data arrives
  const leadingBidComment = optimistic?.comment || fetchedComment;
  const optimisticBidCount = optimistic ? bids.length + 1 : bids.length;

  // Reserve price and min bid increment from contract
  const { data: reservePriceWei } = useReadContract({
    address: DAO_ADDRESSES.auction as `0x${string}`,
    abi: auctionAbi,
    functionName: "reservePrice",
    chainId: CHAIN.id,
    query: { staleTime: 60 * 1000 },
  });
  const reservePriceEth = reservePriceWei ? Number(formatEther(reservePriceWei)) : 0.01;

  const { data: minBidIncrementRaw } = useReadContract({
    address: DAO_ADDRESSES.auction as `0x${string}`,
    abi: auctionAbi,
    functionName: "minBidIncrement",
    chainId: CHAIN.id,
    query: { staleTime: 60 * 1000 },
  });
  const minBidIncrementPct = minBidIncrementRaw ? Number(minBidIncrementRaw) : 10;

  // Derived state
  const tokenName = tokenUri?.name;
  const imageUrl = tokenUri?.image
    ? tokenUri.image.startsWith("ipfs://")
      ? tokenUri.image.replace("ipfs://", "https://ipfs.io/ipfs/")
      : tokenUri.image
    : undefined;

  const isWinner =
    address && displayBidder && address.toLowerCase() === displayBidder.toLowerCase();

  // Determine if auction is live — re-check every second
  const [isLive, setIsLive] = useState(false);
  useEffect(() => {
    if (!displayEndTime) {
      setIsLive(false);
      return;
    }
    const check = () => setIsLive(displayEndTime * 1000 > Date.now());
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [displayEndTime]);

  // Outbid notification
  const { wasOutbid, latestBid, clearOutbid } = auctionLive;
  useEffect(() => {
    if (wasOutbid && latestBid) {
      toast.warning("You've been outbid!", {
        description: `Current bid: ${latestBid.amountEth} ETH`,
        action: {
          label: "Bid Again",
          onClick: () => {
            const input = document.querySelector<HTMLInputElement>('input[type="number"]');
            input?.focus();
          },
        },
        duration: 8000,
      });
      clearOutbid();
    }
  }, [wasOutbid, latestBid, clearOutbid]);

  const handleBidConfirmed = useCallback(
    (comment: string, bidAmount: string) => {
      bidsCountWhenOptimisticRef.current = bids.length;
      setOptimistic({ comment, bidAmount });
    },
    [bids.length],
  );

  return (
    <Card className="w-full bg-card">
      <CardContent className="py-2">
        <div className="space-y-4">
          <div className="text-xl font-semibold">
            {tokenName || (tokenId ? `#${tokenId.toString()}` : "Latest Auction")}
          </div>

          <GnarImageTile tokenId={Number(tokenId || 0)} imageUrl={imageUrl} />

          <div className="space-y-2">
            <AuctionLiveStatus
              highestBid={displayBid}
              highestBidder={displayBidder}
              endTime={displayEndTime}
              startTime={startTime}
              bidSignal={auctionLive.bidCount}
              leadingBidComment={leadingBidComment}
              bidCount={optimisticBidCount}
              onBidHistoryOpen={() => setIsBidHistoryOpen(true)}
            />

            {isLive ? (
              <AuctionBidForm
                tokenId={tokenId ? BigInt(tokenId) : undefined}
                highestBid={displayBid}
                reservePriceEth={reservePriceEth}
                minBidIncrementPct={minBidIncrementPct}
                onBidConfirmed={handleBidConfirmed}
              />
            ) : (
              <AuctionSettleButton isWinner={!!isWinner} />
            )}
          </div>

          <BidHistoryModal
            tokenId={tokenId?.toString()}
            tokenName={tokenUri?.name}
            open={isBidHistoryOpen}
            onOpenChange={setIsBidHistoryOpen}
          />
        </div>
      </CardContent>
    </Card>
  );
}
