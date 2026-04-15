"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MessageSquare, Wallet } from "lucide-react";
import { concat, encodeFunctionData, formatEther, type Hex, parseEther, toHex } from "viem";
import { base as wagmiBase } from "wagmi/chains";
import { useBalance } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { getContract, prepareContractCall, prepareTransaction, sendTransaction } from "thirdweb";
import { base } from "thirdweb/chains";
import {
  useActiveWallet,
  useActiveWalletChain,
  useConnectModal,
} from "thirdweb/react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { DAO_ADDRESSES } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain } from "@/lib/thirdweb-tx";
import { THIRDWEB_AA_CONFIG, THIRDWEB_WALLETS } from "@/lib/thirdweb-wallets";
import auctionAbi from "@/utils/abis/auctionAbi";
import { toast } from "sonner";
import { useAuctionTransaction } from "@/hooks/use-auction-transaction";
import { useUserAddress } from "@/hooks/use-user-address";
import { useWriteAccount } from "@/hooks/use-write-account";

interface AuctionBidFormProps {
  tokenId: bigint | undefined;
  highestBid: string | undefined;
  reservePriceEth: number;
  /** Min bid increment percentage from contract (e.g., 10 = 10%) */
  minBidIncrementPct: number;
  onBidConfirmed?: (comment: string, bidAmount: string) => void;
}

export function AuctionBidForm({
  tokenId,
  highestBid,
  reservePriceEth,
  minBidIncrementPct,
  onBidConfirmed,
}: AuctionBidFormProps) {
  const { address, isConnected } = useUserAddress();
  const activeChain = useActiveWalletChain();
  const wallet = useActiveWallet();
  const writer = useWriteAccount();
  const { connect: openConnectModal } = useConnectModal();
  const queryClient = useQueryClient();

  const [bidComment, setBidComment] = useState("");
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  const { data: balanceData } = useBalance({
    address: address,
    chainId: wagmiBase.id,
    query: { enabled: isConnected },
  });
  const balanceEth = balanceData ? Number(formatEther(balanceData.value)) : undefined;

  const minNextBidEth = useMemo(() => {
    const current = Number(highestBid ?? "0");
    if (!Number.isFinite(current) || current <= 0) return reservePriceEth;
    const multiplier = 1 + minBidIncrementPct / 100;
    const raw = current * multiplier;
    return Math.ceil(raw * 1e6) / 1e6;
  }, [highestBid, reservePriceEth, minBidIncrementPct]);

  const minBidDisplay = useMemo(() => {
    const s = minNextBidEth.toFixed(6);
    return s.replace(/0+$/, "").replace(/\.$/, "") || s.slice(0, s.indexOf(".") + 5);
  }, [minNextBidEth]);

  const [bidAmount, setBidAmount] = useState(minBidDisplay);

  useEffect(() => {
    setBidAmount((prev) => {
      const parsed = parseFloat(prev);
      return isNaN(parsed) || parsed < minNextBidEth ? minBidDisplay : prev;
    });
  }, [minNextBidEth, minBidDisplay]);

  const bidAmountNum = parseFloat(bidAmount);
  const isValidBid = !isNaN(bidAmountNum) && bidAmountNum >= minNextBidEth;
  const insufficientBalance = isConnected && balanceEth !== undefined && bidAmountNum > balanceEth;
  const isWrongNetwork = isConnected && activeChain?.id !== wagmiBase.id;

  const bidAmountWei = useMemo(() => {
    try {
      return isValidBid ? parseEther(bidAmount) : undefined;
    } catch {
      return undefined;
    }
  }, [bidAmount, isValidBid]);

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
      if (pendingBidRef.current) {
        const multiplier = 1 + minBidIncrementPct / 100;
        const raw = parseFloat(pendingBidRef.current.amount) * multiplier;
        setBidAmount((Math.ceil(raw * 1e6) / 1e6).toString());
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

  const handleConnectAndBid = async () => {
    if (isConnected) return;
    const client = getThirdwebClient();
    if (!client) {
      toast.error("Connect failed", { description: "Thirdweb client not configured." });
      return;
    }
    try {
      await openConnectModal({
        client,
        wallets: THIRDWEB_WALLETS,
        accountAbstraction: THIRDWEB_AA_CONFIG,
        size: "compact",
        title: "Connect to bid",
      });
    } catch {
      // User dismissed the modal
    }
  };

  const handleBid = async () => {
    if (!isConnected) {
      await handleConnectAndBid();
      return;
    }
    if (!bidAmountWei || !tokenId || !isValidBid || insufficientBalance) return;

    if (!writer) {
      toast.error("Connect wallet first");
      return;
    }

    const client = getThirdwebClient();
    if (!client) {
      toast.error("Bid failed", { description: "Thirdweb client not configured." });
      return;
    }

    const trimmedComment = bidComment.trim();
    pendingBidRef.current = { comment: trimmedComment, amount: bidAmount };

    await bidTx.execute(async () => {
      await ensureOnChain(wallet, base);

      if (trimmedComment.length > 0) {
        const baseCalldata = encodeFunctionData({
          abi: auctionAbi,
          functionName: "createBid",
          args: [tokenId],
        });
        const commentBytes = toHex(new TextEncoder().encode(trimmedComment));
        const fullData = concat([baseCalldata, commentBytes]);

        const tx = prepareTransaction({
          chain: base,
          to: DAO_ADDRESSES.auction as `0x${string}`,
          data: fullData as Hex,
          value: bidAmountWei,
          client,
        });

        const result = await sendTransaction({
          account: writer.account,
          transaction: tx,
        });
        return result.transactionHash as `0x${string}`;
      }

      const contract = getContract({
        client,
        chain: base,
        address: DAO_ADDRESSES.auction as `0x${string}`,
        abi: auctionAbi,
      });

      const tx = prepareContractCall({
        contract,
        method: "createBid",
        params: [tokenId],
        value: bidAmountWei,
      });

      const result = await sendTransaction({
        account: writer.account,
        transaction: tx,
      });
      return result.transactionHash as `0x${string}`;
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
      await handleConnectAndBid();
      return;
    }
    if (isWrongNetwork) {
      try {
        await ensureOnChain(wallet, base);
        handleBid();
      } catch {
        // User rejected
      }
      return;
    }
    handleBid();
  };

  const isButtonDisabled =
    bidTx.isActive || (isConnected && !isWrongNetwork && (!isValidBid || insufficientBalance));

  return (
    <>
      <div className="flex gap-2">
        <InputGroup className="flex-[3]">
          <InputGroupInput
            type="number"
            step="0.0001"
            min={minNextBidEth}
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder={minBidDisplay}
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

      <div className="flex items-center justify-between text-xs">
        <div className="text-muted-foreground flex items-center gap-2">
          <span>Min: {minBidDisplay} ETH</span>
          {isConnected && insufficientBalance ? (
            <span className="text-destructive">
              · Insufficient{balanceEth !== undefined ? ` (${balanceEth.toFixed(4)})` : ""}
            </span>
          ) : isConnected && balanceEth !== undefined ? (
            <span>· Bal: {balanceEth.toFixed(4)}</span>
          ) : isWrongNetwork ? (
            <span className="text-amber-500">· Wrong network</span>
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
            <div className="text-right text-xs text-muted-foreground">{bidComment.length}/140</div>
          </div>
        </CollapsibleContent>
      </Collapsible>

    </>
  );
}
