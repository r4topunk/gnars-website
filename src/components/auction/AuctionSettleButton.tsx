"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { base } from "thirdweb/chains";
import { useActiveWalletChain, useConnectModal } from "thirdweb/react";
import { useReadContract, useSimulateContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuctionTransaction } from "@/hooks/use-auction-transaction";
import { useUserAddress } from "@/hooks/use-user-address";
import { useWriteAccount } from "@/hooks/use-write-account";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain } from "@/lib/thirdweb-tx";
import { THIRDWEB_AA_CONFIG, THIRDWEB_WALLETS } from "@/lib/thirdweb-wallets";
import auctionAbi from "@/utils/abis/auctionAbi";

interface AuctionSettleButtonProps {
  /** Whether the connected wallet is the auction winner */
  isWinner: boolean;
}

export function AuctionSettleButton({ isWinner }: AuctionSettleButtonProps) {
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  const { address: userAddress, isConnected } = useUserAddress();
  const activeChain = useActiveWalletChain();
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
    // wagmi v2 looks up the simulation's `from` address on the active
    // connector by default. Option F removed all wagmi connectors, so
    // without an explicit `account` the simulation throws
    // "Connector not connected." before it ever hits the RPC. Pass the
    // thirdweb-sourced user address directly so the simulation runs
    // independently of wagmi's (now-empty) connection state.
    account: userAddress,
    query: { enabled: isConnected && !isWrongNetwork && Boolean(userAddress) },
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
      await ensureOnChain(writer.wallet, base);

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
