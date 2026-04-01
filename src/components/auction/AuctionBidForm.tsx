"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MessageSquare, Wallet } from "lucide-react";
import { encodeFunctionData, concat, formatEther, parseEther, toHex } from "viem";
import { base } from "wagmi/chains";
import {
  useAccount,
  useBalance,
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";
import auctionAbi from "@/utils/abis/auctionAbi";
import { toast } from "sonner";
import { useAuctionTransaction } from "@/hooks/use-auction-transaction";
import { ConnectWalletModal } from "@/components/auction/ConnectWalletModal";

interface AuctionBidFormProps {
  tokenId: bigint | undefined;
  highestBid: string | undefined;
  reservePriceEth: number;
  onBidConfirmed?: (comment: string, bidAmount: string) => void;
}

export function AuctionBidForm({
  tokenId,
  highestBid,
  reservePriceEth,
  onBidConfirmed,
}: AuctionBidFormProps) {
  const { address, isConnected, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const queryClient = useQueryClient();

  const [bidComment, setBidComment] = useState("");
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  // Balance check
  const { data: balanceData } = useBalance({
    address: address,
    chainId: base.id,
    query: { enabled: isConnected },
  });
  const balanceEth = balanceData ? Number(formatEther(balanceData.value)) : undefined;

  // Min bid calculation
  const minNextBidEth = useMemo(() => {
    const current = Number(highestBid ?? "0");
    if (!Number.isFinite(current) || current <= 0) return reservePriceEth;
    return Math.max(0, current * 1.01);
  }, [highestBid, reservePriceEth]);

  const [bidAmount, setBidAmount] = useState(minNextBidEth.toFixed(4));

  // Update bid amount when minimum changes — only if current value is below new minimum
  useEffect(() => {
    setBidAmount((prev) => {
      const parsed = parseFloat(prev);
      return isNaN(parsed) || parsed < minNextBidEth ? minNextBidEth.toFixed(4) : prev;
    });
  }, [minNextBidEth]);

  // Validation
  const bidAmountNum = parseFloat(bidAmount);
  const isValidBid = !isNaN(bidAmountNum) && bidAmountNum >= minNextBidEth;
  const insufficientBalance = isConnected && balanceEth !== undefined && bidAmountNum > balanceEth;
  const isWrongNetwork = isConnected && chain?.id !== base.id;

  const bidAmountWei = useMemo(() => {
    try {
      return isValidBid ? parseEther(bidAmount) : undefined;
    } catch {
      return undefined;
    }
  }, [bidAmount, isValidBid]);

  // Scoped invalidation
  const invalidateAuctionData = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        if (key[0] === "readContract" && Array.isArray(key)) {
          const serialized = JSON.stringify(key, (_, v) =>
            typeof v === "bigint" ? v.toString() : v,
          );
          return serialized.includes(DAO_ADDRESSES.auction.toLowerCase());
        }
        return false;
      },
    });
  }, [queryClient]);

  const pendingBidRef = useRef<{ comment: string; amount: string } | null>(null);

  const bidTx = useAuctionTransaction({
    onSubmitted: () => {
      if (pendingBidRef.current) {
        onBidConfirmed?.(pendingBidRef.current.comment, pendingBidRef.current.amount);
      }
    },
    onConfirmed: () => {
      toast.success("Bid confirmed!", { description: "Auction data updated." });
      invalidateAuctionData();
      // Force-set bid amount to new minimum based on user's own bid
      if (pendingBidRef.current) {
        const newMin = (parseFloat(pendingBidRef.current.amount) * 1.01).toFixed(4);
        setBidAmount(newMin);
      }
      pendingBidRef.current = null;
      setBidComment("");
      setIsCommentOpen(false);
      resetTimerRef.current = setTimeout(() => bidTx.reset(), 1500);
    },
    onError: () => {
      pendingBidRef.current = null;
      onBidConfirmed?.("", "");
      toast.error("Bid failed");
    },
  });

  const handleConnectAndBid = () => {
    if (!isConnected) {
      setIsConnectModalOpen(true);
    }
  };

  const handleBid = async () => {
    if (!isConnected) {
      handleConnectAndBid();
      return;
    }
    if (!bidAmountWei || !tokenId || !isValidBid || insufficientBalance) return;

    const trimmedComment = bidComment.trim();
    pendingBidRef.current = { comment: trimmedComment, amount: bidAmount };

    await bidTx.execute(async () => {
      if (chain?.id !== base.id) {
        toast.info("Switching to Base network...");
        await switchChainAsync({ chainId: base.id });
      }

      if (trimmedComment.length > 0) {
        const baseCalldata = encodeFunctionData({
          abi: auctionAbi,
          functionName: "createBid",
          args: [tokenId],
        });
        const commentBytes = toHex(new TextEncoder().encode(trimmedComment));
        const fullData = concat([baseCalldata, commentBytes]);

        return sendTransactionAsync({
          to: DAO_ADDRESSES.auction as `0x${string}`,
          data: fullData,
          value: bidAmountWei,
          chainId: base.id,
        });
      } else {
        return writeContractAsync({
          address: DAO_ADDRESSES.auction as `0x${string}`,
          abi: auctionAbi,
          functionName: "createBid",
          args: [tokenId],
          value: bidAmountWei,
          chainId: base.id,
        });
      }
    });
  };

  const getButtonContent = () => {
    if (bidTx.isActive) {
      return (
        <>
          <Spinner />
          {bidTx.buttonLabel("Place Bid")}
        </>
      );
    }
    if (!isConnected) {
      return (
        <>
          <Wallet className="h-4 w-4" />
          Connect Wallet to Bid
        </>
      );
    }
    if (isWrongNetwork) {
      return "Switch to Base";
    }
    return "Place Bid";
  };

  const handleButtonClick = async () => {
    if (!isConnected) {
      handleConnectAndBid();
      return;
    }
    if (isWrongNetwork) {
      try {
        await switchChainAsync({ chainId: base.id });
        handleBid();
      } catch {
        // User rejected
      }
      return;
    }
    handleBid();
  };

  const isButtonDisabled =
    bidTx.isActive ||
    (isConnected && !isWrongNetwork && (!isValidBid || insufficientBalance));

  return (
    <>
      {/* Bid input + button */}
      <div className="flex gap-2">
        <InputGroup className="flex-[3]">
          <InputGroupInput
            type="number"
            step="0.0001"
            min={minNextBidEth}
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder={minNextBidEth.toFixed(4)}
            disabled={bidTx.isActive}
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>ETH</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <Button
          className="flex-[7] touch-manipulation"
          disabled={isButtonDisabled}
          onClick={handleButtonClick}
        >
          {getButtonContent()}
        </Button>
      </div>

      {/* Inline status row: balance + insufficient warning + comment toggle */}
      <div className="flex items-center justify-between text-xs">
        <div className="text-muted-foreground">
          {isConnected && insufficientBalance ? (
            <span className="text-destructive">
              Insufficient balance{balanceEth !== undefined ? ` (${balanceEth.toFixed(4)} ETH)` : ""}
            </span>
          ) : isConnected && balanceEth !== undefined ? (
            <span>Balance: {balanceEth.toFixed(4)} ETH</span>
          ) : isWrongNetwork ? (
            <span className="text-amber-500">Switch to Base to bid</span>
          ) : !isConnected ? (
            <span>Min: {minNextBidEth.toFixed(4)} ETH</span>
          ) : null}
        </div>
        <Collapsible open={isCommentOpen} onOpenChange={setIsCommentOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              disabled={bidTx.isActive}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <MessageSquare className="h-3 w-3" />
              <span>Comment</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${isCommentOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      {/* Comment textarea — outside the row so it expands below */}
      <Collapsible open={isCommentOpen} onOpenChange={setIsCommentOpen}>
        <CollapsibleContent>
          <div className="space-y-1">
            <textarea
              maxLength={140}
              rows={2}
              value={bidComment}
              onChange={(e) => setBidComment(e.target.value)}
              disabled={bidTx.isActive}
              placeholder="On-chain comment (recorded permanently)…"
              className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            <div className="text-right text-xs text-muted-foreground">
              {bidComment.length}/140
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <ConnectWalletModal
        open={isConnectModalOpen}
        onOpenChange={setIsConnectModalOpen}
      />
    </>
  );
}
