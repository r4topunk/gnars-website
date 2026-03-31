"use client";

import { useCallback } from "react";
import { base } from "wagmi/chains";
import {
  useAccount,
  useReadContract,
  useSimulateContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";
import auctionAbi from "@/utils/abis/auctionAbi";
import { toast } from "sonner";
import { useAuctionTransaction } from "@/hooks/use-auction-transaction";

interface AuctionSettleButtonProps {
  /** Whether the connected wallet is the auction winner */
  isWinner: boolean;
}

export function AuctionSettleButton({ isWinner }: AuctionSettleButtonProps) {
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  // Check if auctions are paused
  const { data: isPaused } = useReadContract({
    address: DAO_ADDRESSES.auction as `0x${string}`,
    abi: auctionAbi,
    functionName: "paused",
    chainId: CHAIN.id,
    query: { staleTime: 30 * 1000 },
  });

  // Simulation
  const {
    data: settleData,
    error: settleError,
    isLoading: isSimulating,
  } = useSimulateContract({
    address: DAO_ADDRESSES.auction as `0x${string}`,
    abi: auctionAbi,
    functionName: isPaused ? "settleAuction" : "settleCurrentAndCreateNewAuction",
    chainId: CHAIN.id,
  });

  // Scoped invalidation — only auction-related readContract queries
  // wagmi useReadContract generates keys: ['readContract', { address, functionName, ... }]
  const invalidateAuctionData = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        if (key[0] === "readContract" && Array.isArray(key)) {
          const serialized = JSON.stringify(key);
          return serialized.includes(DAO_ADDRESSES.auction.toLowerCase());
        }
        return false;
      },
    });
  }, [queryClient]);

  const settleTx = useAuctionTransaction({
    onConfirmed: () => {
      toast.success("Settlement confirmed!", {
        description: "Loading new auction...",
      });
      invalidateAuctionData();
      setTimeout(() => settleTx.reset(), 1500);
    },
    onError: (error) => {
      toast.error("Settlement failed", { description: error.message });
    },
  });

  const handleSettle = async () => {
    if (!settleData || settleError) return;

    await settleTx.execute(async () => {
      if (chain?.id !== base.id) {
        toast.info("Switching to Base network...");
        await switchChainAsync({ chainId: base.id });
      }
      return writeContractAsync({
        ...settleData.request,
        chainId: base.id,
      });
    });
  };

  // Button content
  const getButtonContent = () => {
    if (settleTx.isActive) {
      return (
        <>
          <Spinner />
          {settleTx.buttonLabel("Settle Auction")}
        </>
      );
    }
    if (isSimulating) {
      return (
        <>
          <Spinner />
          Preparing...
        </>
      );
    }
    if (isWinner) {
      return "Claim Your Gnar & Start Next Auction";
    }
    return "Settle Auction";
  };

  const isDisabled = settleTx.isActive || isSimulating || !!settleError || !settleData;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="w-full">
          <Button
            className="w-full touch-manipulation"
            disabled={isDisabled}
            onClick={handleSettle}
          >
            {getButtonContent()}
          </Button>
        </span>
      </TooltipTrigger>
      {settleError && (
        <TooltipContent side="bottom">
          Settlement not available yet. Try again shortly.
        </TooltipContent>
      )}
    </Tooltip>
  );
}
