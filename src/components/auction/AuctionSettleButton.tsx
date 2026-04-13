"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Wallet } from "lucide-react";
import { useAccount, useReadContract, useSimulateContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { getContract, prepareContractCall } from "thirdweb";
import { base } from "thirdweb/chains";
import { useActiveWallet, useSendTransaction } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain } from "@/lib/thirdweb-tx";
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
  const wallet = useActiveWallet();
  const sendTx = useSendTransaction();
  const queryClient = useQueryClient();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const isWrongNetwork = isConnected && chain?.id !== base.id;

  const { data: isPaused } = useReadContract({
    address: DAO_ADDRESSES.auction as `0x${string}`,
    abi: auctionAbi,
    functionName: "paused",
    chainId: CHAIN.id,
    query: { staleTime: 30 * 1000 },
  });

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

    const client = getThirdwebClient();
    if (!client) {
      toast.error("Settlement failed", { description: "Thirdweb client not configured." });
      return;
    }

    if (!settleData || settleError) return;

    const methodName = isPaused ? "settleAuction" : "settleCurrentAndCreateNewAuction";

    await settleTx.execute(async () => {
      await ensureOnChain(wallet, base);

      const contract = getContract({
        client,
        chain: base,
        address: DAO_ADDRESSES.auction as `0x${string}`,
        abi: auctionAbi,
      });

      const tx = prepareContractCall({
        contract,
        method: methodName,
        params: [],
      });

      const result = await sendTx.mutateAsync(tx);
      return result.transactionHash as `0x${string}`;
    });
  };

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

      <ConnectWalletModal open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen} />
    </>
  );
}
