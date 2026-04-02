"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Wallet } from "lucide-react";
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
import { ConnectWalletModal } from "@/components/auction/ConnectWalletModal";

interface AuctionSettleButtonProps {
  /** Whether the connected wallet is the auction winner */
  isWinner: boolean;
}

export function AuctionSettleButton({ isWinner }: AuctionSettleButtonProps) {
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  const { isConnected, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const isWrongNetwork = isConnected && chain?.id !== base.id;

  // Check if auctions are paused
  const { data: isPaused } = useReadContract({
    address: DAO_ADDRESSES.auction as `0x${string}`,
    abi: auctionAbi,
    functionName: "paused",
    chainId: CHAIN.id,
    query: { staleTime: 30 * 1000 },
  });

  // Simulation — only run when connected and on the right network
  const {
    data: settleData,
    error: settleError,
    isLoading: isSimulating,
  } = useSimulateContract({
    address: DAO_ADDRESSES.auction as `0x${string}`,
    abi: auctionAbi,
    functionName: isPaused ? "settleAuction" : "settleCurrentAndCreateNewAuction",
    chainId: CHAIN.id,
    query: { enabled: isConnected && !isWrongNetwork },
  });

  // Scoped invalidation — only auction-related readContract queries
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

  const settleTx = useAuctionTransaction({
    onConfirmed: () => {
      toast.success("Settlement confirmed!", {
        description: "Loading new auction...",
      });
      invalidateAuctionData();
      resetTimerRef.current = setTimeout(() => settleTx.reset(), 1500);
    },
    onError: (error) => {
      toast.error("Settlement failed", { description: error.message });
    },
  });

  const handleSettle = async () => {
    if (!isConnected) {
      setIsConnectModalOpen(true);
      return;
    }
    if (isWrongNetwork) {
      try {
        await switchChainAsync({ chainId: base.id });
      } catch {
        return;
      }
    }
    if (!settleData || settleError) return;

    await settleTx.execute(async () => {
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
    if (!isConnected) {
      return (
        <>
          <Wallet className="h-4 w-4" />
          Connect Wallet to Settle
        </>
      );
    }
    if (isWrongNetwork) {
      return "Switch to Base";
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

  // Button is only disabled when actively transacting or simulation failed (while connected)
  const isDisabled =
    settleTx.isActive ||
    (isConnected && !isWrongNetwork && (isSimulating || !!settleError || !settleData));

  return (
    <>
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
        {isConnected && !isWrongNetwork && settleError && (
          <TooltipContent side="bottom">
            Settlement not available yet. Try again shortly.
          </TooltipContent>
        )}
      </Tooltip>

      <ConnectWalletModal
        open={isConnectModalOpen}
        onOpenChange={setIsConnectModalOpen}
      />
    </>
  );
}
