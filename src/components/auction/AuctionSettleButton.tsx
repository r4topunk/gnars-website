"use client";

import { useCallback, useEffect, useRef } from "react";
import { Wallet } from "lucide-react";
import { useReadContract, useSimulateContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { base } from "thirdweb/chains";
import {
  useActiveWallet,
  useActiveWalletChain,
  useConnectModal,
} from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain } from "@/lib/thirdweb-tx";
import { THIRDWEB_AA_CONFIG, THIRDWEB_WALLETS } from "@/lib/thirdweb-wallets";
import auctionAbi from "@/utils/abis/auctionAbi";
import { toast } from "sonner";
import { useAuctionTransaction } from "@/hooks/use-auction-transaction";
import { useUserAddress } from "@/hooks/use-user-address";
import { useWriteAccount } from "@/hooks/use-write-account";

interface AuctionSettleButtonProps {
  /** Whether the connected wallet is the auction winner */
  isWinner: boolean;
}

export function AuctionSettleButton({ isWinner }: AuctionSettleButtonProps) {
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  const { isConnected } = useUserAddress();
  const activeChain = useActiveWalletChain();
  const wallet = useActiveWallet();
  const writer = useWriteAccount();
  const { connect: openConnectModal } = useConnectModal();
  const queryClient = useQueryClient();

  const isWrongNetwork = isConnected && activeChain?.id !== base.id;

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

  // DEBUG: surface the real revert reason behind the "not available yet"
  // tooltip. Remove once the cause is confirmed.
  useEffect(() => {
    if (settleError) {
      // eslint-disable-next-line no-console
      console.log("[AuctionSettleButton] simulation revert:", {
        functionName: isPaused ? "settleAuction" : "settleCurrentAndCreateNewAuction",
        message: settleError.message,
        shortMessage: (settleError as { shortMessage?: string }).shortMessage,
        cause: settleError.cause,
      });
    }
  }, [settleError, isPaused]);

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
          title: "Connect to settle",
        });
      } catch {
        // User dismissed the modal
      }
      return;
    }

    if (!writer) {
      toast.error("Connect wallet first");
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

      const result = await sendTransaction({
        account: writer.account,
        transaction: tx,
      });
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

    </>
  );
}
