"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, ChevronDown, MessageSquare } from "lucide-react";
import { parseEther, zeroAddress, encodeFunctionData, concat, toHex } from "viem";
import { base } from "wagmi/chains";
import { useDaoAuction } from "@buildeross/hooks";
import { useAccount, useReadContract, useSimulateContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useSendTransaction } from "wagmi";
import { GnarImageTile } from "@/components/auctions/GnarImageTile";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { getStatusConfig } from "@/components/proposals/utils";
import { ProposalStatus } from "@/lib/schemas/proposals";
import auctionAbi from "@/utils/abis/auctionAbi";
import { toast } from "sonner";

export function AuctionSpotlight() {
  const { address, isConnected, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { highestBid, highestBidder, endTime, startTime, tokenId, tokenUri } = useDaoAuction({
    collectionAddress: GNARS_ADDRESSES.token,
    auctionAddress: GNARS_ADDRESSES.auction,
    chainId: CHAIN.id,
  });

  const [isSettling, setIsSettling] = useState(false);
  const [settleTxHash, setSettleTxHash] = useState<`0x${string}` | undefined>();
  const [isBidding, setIsBidding] = useState(false);
  const [bidComment, setBidComment] = useState("");
  const [isCommentOpen, setIsCommentOpen] = useState(false);

  // Calculate minimum bid (1% increment)
  const minNextBidEth = useMemo(() => {
    const current = Number(highestBid ?? "0");
    if (!Number.isFinite(current) || current <= 0) return 0.01;
    return Math.max(0, current * 1.01);
  }, [highestBid]);

  const [bidAmount, setBidAmount] = useState(minNextBidEth.toFixed(4));
  const tokenName = tokenUri?.name;
  const imageUrl = tokenUri?.image
    ? tokenUri.image.startsWith("ipfs://")
      ? tokenUri.image.replace("ipfs://", "https://ipfs.io/ipfs/")
      : tokenUri.image
    : undefined;
  const endTimeMs = endTime ? new Date(endTime * 1000).getTime() : 0;
  const startTimeMs = startTime ? new Date(startTime * 1000).getTime() : 0;
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    if (!endTimeMs) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const distance = endTimeMs - now;
      if (distance > 0) {
        setTimeLeft({
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
          total: distance,
        });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, total: 0 });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [endTimeMs]);

  const { progressPercentage, isLive, isEndingSoon } = useMemo(() => {
    const fallbackDuration = 24 * 60 * 60 * 1000;
    const duration = startTimeMs && endTimeMs ? Math.max(endTimeMs - startTimeMs, 0) : fallbackDuration;
    const elapsed = Math.max(0, Math.min(duration, duration - Math.max(timeLeft.total, 0)));
    const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
    const live = timeLeft.total > 0;
    const endingSoon = live && timeLeft.total <= 5 * 60 * 1000;
    return { progressPercentage: progress, isLive: live, isEndingSoon: endingSoon };
  }, [startTimeMs, endTimeMs, timeLeft.total]);

  const badgeStatus: ProposalStatus = isLive
    ? isEndingSoon
      ? ProposalStatus.PENDING
      : ProposalStatus.ACTIVE
    : ProposalStatus.DEFEATED;
  const { color } = getStatusConfig(badgeStatus);
  const badgeLabel = isLive ? (isEndingSoon ? "Ending Soon" : "Live Auction") : "Ended";

  // Update bid amount when minimum changes
  useEffect(() => {
    setBidAmount(minNextBidEth.toFixed(4));
  }, [minNextBidEth]);

  // Validate bid amount
  const bidAmountNum = parseFloat(bidAmount);
  const isValidBid = !isNaN(bidAmountNum) && bidAmountNum >= minNextBidEth;
  
  const bidAmountWei = useMemo(() => {
    try {
      return isValidBid ? parseEther(bidAmount) : undefined;
    } catch {
      return undefined;
    }
  }, [bidAmount, isValidBid]);

  // Check if auctions are paused - cache for 30 seconds since this can change
  const { data: isPaused } = useReadContract({
    address: GNARS_ADDRESSES.auction as `0x${string}`,
    abi: auctionAbi,
    functionName: "paused",
    chainId: CHAIN.id,
    query: {
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: false,
    },
  });

  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  // Handle bid submission
  const handleBid = async () => {
    if (!isConnected || !bidAmountWei || !tokenId || !isValidBid) return;

    const trimmedComment = bidComment.trim();

    try {
      setIsBidding(true);

      if (chain?.id !== base.id) {
        toast.info("Switching to Base network...");
        await switchChainAsync({ chainId: base.id });
      }

      if (trimmedComment.length > 0) {
        // Comment path: encode createBid calldata + append UTF-8 comment bytes
        const baseCalldata = encodeFunctionData({
          abi: auctionAbi,
          functionName: "createBid",
          args: [BigInt(tokenId)],
        });
        const commentBytes = toHex(new TextEncoder().encode(trimmedComment));
        const fullData = concat([baseCalldata, commentBytes]);

        await sendTransactionAsync({
          to: GNARS_ADDRESSES.auction as `0x${string}`,
          data: fullData,
          value: bidAmountWei,
          chainId: base.id,
        });
      } else {
        // Original path (no regression)
        await writeContractAsync({
          address: GNARS_ADDRESSES.auction as `0x${string}`,
          abi: auctionAbi,
          functionName: "createBid",
          args: [BigInt(tokenId)],
          value: bidAmountWei,
          chainId: base.id,
        });
      }

      toast.success("Bid submitted", {
        description: trimmedComment.length > 0
          ? "Your comment was recorded on-chain."
          : "Waiting for confirmation...",
      });
      setTimeout(() => window.location.reload(), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit bid";
      toast.error("Bid failed", { description: message });
    } finally {
      setIsBidding(false);
    }
  };

  // Settlement simulation - only when auction has ended
  const isAuctionEnded = !isLive && timeLeft.total <= 0;
  const { data: settleData, error: settleError } = useSimulateContract({
    address: GNARS_ADDRESSES.auction as `0x${string}`,
    abi: auctionAbi,
    functionName: isPaused ? "settleAuction" : "settleCurrentAndCreateNewAuction",
    chainId: CHAIN.id,
    query: { enabled: isAuctionEnded },
  });

  // Check if connected user is the winner
  const isWinner =
    address && highestBidder && address.toLowerCase() === highestBidder.toLowerCase();

  // Wait for settlement transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: settleTxHash,
    chainId: CHAIN.id,
  });

  // Settlement handler
  const handleSettle = async () => {
    if (!settleData || settleError) return;

    try {
      setIsSettling(true);
      
      // Check if on correct network, switch if needed
      if (chain?.id !== base.id) {
        toast.info("Switching to Base network...");
        await switchChainAsync({ chainId: base.id });
      }
      
      const hash = await writeContractAsync({
        ...settleData.request,
        chainId: base.id,
      });
      setSettleTxHash(hash);
      toast.success("Settlement submitted", {
        description: "Waiting for confirmation...",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to settle auction";
      toast.error("Settlement failed", { description: message });
      setIsSettling(false);
      setSettleTxHash(undefined);
    }
  };

  // Handle successful confirmation
  useEffect(() => {
    if (isConfirmed && settleTxHash) {
      toast.success("Settlement confirmed!", {
        description: "Reloading to show new auction...",
      });
      setTimeout(() => window.location.reload(), 2000);
    }
  }, [isConfirmed, settleTxHash]);

  return (
    <Card className="w-full bg-card">
      <CardContent className="py-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-semibold">
              {tokenName?.replace("Gnars", "Gnar") || (tokenId ? `Gnar #${tokenId.toString()}` : "Latest Auction")}
            </div>
            <Badge className={`${color} text-xs`}>{badgeLabel}</Badge>
          </div>

          <GnarImageTile tokenId={Number(tokenId || 0)} imageUrl={imageUrl} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col text-center items-start">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Time left
                </div>
                <div className="text-xl font-mono">
                  {timeLeft.hours.toString().padStart(2, "0")}:{timeLeft.minutes
                    .toString()
                    .padStart(2, "0")}:{timeLeft.seconds.toString().padStart(2, "0")}
                </div>
              </div>
              <div className="flex flex-col text-center items-end">
                <div className="text-sm text-muted-foreground">Current Highest Bid</div>
                <div className="text-2xl font-bold">{highestBid ? `${highestBid} ETH` : "—"}</div>
              </div>
            </div>

            <Progress value={progressPercentage} className="h-2" />

            {isLive ? (
              <>
                <div className="flex gap-2">
                  <Tooltip open={isLive && !isValidBid && isConnected && !!bidAmount}>
                    <TooltipTrigger asChild>
                      <InputGroup className="flex-[3]">
                        <InputGroupInput
                          type="number"
                          step="0.0001"
                          min={minNextBidEth}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder={minNextBidEth.toFixed(4)}
                          disabled={!isConnected || isBidding}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupText>ETH</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="font-mono">
                      Minimum bid: {minNextBidEth} ETH
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    className="flex-[7] touch-manipulation"
                    disabled={!isConnected || isBidding || !isValidBid}
                    onClick={handleBid}
                  >
                    {isBidding ? (
                      <>
                        <Spinner />
                        Bidding...
                      </>
                    ) : (
                      "Place Bid"
                    )}
                  </Button>
                </div>
                <Collapsible open={isCommentOpen} onOpenChange={setIsCommentOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      disabled={!isConnected || isBidding}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Add a comment
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-200 ${isCommentOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-1">
                      <textarea
                        maxLength={140}
                        rows={2}
                        value={bidComment}
                        onChange={(e) => setBidComment(e.target.value)}
                        disabled={!isConnected || isBidding}
                        placeholder="Optional on-chain comment (recorded permanently)…"
                        className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      />
                      <div className="text-right text-xs text-muted-foreground">
                        {bidComment.length}/140
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            ) : (
              <Button
                className="w-full touch-manipulation"
                disabled={isSettling || isConfirming || !!settleError}
                onClick={handleSettle}
              >
                {isSettling || isConfirming ? (
                  <>
                    <Spinner />
                    {isConfirming ? "Confirming..." : "Settling…"}
                  </>
                ) : isWinner ? (
                  "Claim NFT"
                ) : (
                  "Settle Auction"
                )}
              </Button>
            )}

            {isLive && !isConnected && (
              <p className="text-xs text-muted-foreground text-center">
                Connect your wallet to place a bid
              </p>
            )}

            {highestBidder && highestBidder !== zeroAddress && (
              <div className="text-center text-xs text-muted-foreground">
                <span className="mr-1">{isLive ? "Leading bidder:" : "Winner:"}</span>
                <AddressDisplay
                  address={highestBidder}
                  variant="compact"
                  showAvatar={false}
                  showCopy={false}
                  showExplorer={false}
                  truncateLength={4}
                  className="inline-flex"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


