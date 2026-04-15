"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { parseEther } from "viem";
import { useSimulateContract } from "wagmi";
import { base as wagmiBase } from "wagmi/chains";
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
import { DAO_ADDRESSES } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain, normalizeTxError } from "@/lib/thirdweb-tx";
import { useUserAddress } from "@/hooks/use-user-address";
import { useWriteAccount } from "@/hooks/use-write-account";
import { zoraNftMintAbi, ZORA_PROTOCOL_REWARD } from "@/utils/abis/zoraNftMintAbi";

const MINT_REFERRAL = DAO_ADDRESSES.treasury as `0x${string}`;
const MINT_TOAST_ID = "mint-transaction";

export interface UseMintDroposalArgs {
  tokenAddress: `0x${string}` | undefined;
  priceEth: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

export type MintStatus = "idle" | "confirming-wallet" | "pending-tx" | "success" | "error";

export function useMintDroposal({
  tokenAddress,
  priceEth,
  onSuccess,
  onError,
}: UseMintDroposalArgs) {
  const [mintStatus, setMintStatus] = useState<MintStatus>("idle");
  const { address, isConnected } = useUserAddress();
  const writer = useWriteAccount();

  const isValidTokenAddress =
    tokenAddress &&
    tokenAddress.length === 42 &&
    tokenAddress !== "0x0000000000000000000000000000000000000000";

  const isReady = Boolean(isValidTokenAddress && isConnected && address);

  const simulationPrice = parseEther(
    (parseFloat(priceEth) + ZORA_PROTOCOL_REWARD).toFixed(18),
  );

  const { isError: simulateError } = useSimulateContract({
    abi: zoraNftMintAbi,
    address: tokenAddress as `0x${string}`,
    functionName: "mintWithRewards",
    args: [address!, 1n, "", MINT_REFERRAL],
    value: simulationPrice,
    // Explicit `account` so wagmi doesn't try to pull it from an empty
    // connector list (Option F).
    account: address,
    query: {
      enabled: isReady && mintStatus === "idle" && Boolean(address),
    },
    chainId: wagmiBase.id,
  });

  const mint = useCallback(
    async (quantity: number = 1, comment?: string) => {
      if (!isReady || !tokenAddress || !address) {
        toast.error("Unable to mint", {
          description: isConnected
            ? "Sale is not available."
            : "Please connect your wallet first.",
        });
        return;
      }

      if (!writer) {
        toast.error("Unable to mint", {
          description: "Please connect your wallet first.",
        });
        return;
      }

      const client = getThirdwebClient();
      if (!client) {
        toast.error("Unable to mint", {
          description: "Thirdweb client not configured.",
        });
        return;
      }

      try {
        setMintStatus("confirming-wallet");

        await ensureOnChain(writer.wallet, base);

        toast.loading("Confirm in your wallet...", {
          id: MINT_TOAST_ID,
          description: "Please approve the transaction in your wallet.",
        });

        const salePrice = parseFloat(priceEth) * quantity;
        const protocolReward = ZORA_PROTOCOL_REWARD * quantity;
        const totalPrice = parseEther((salePrice + protocolReward).toFixed(18));

        const contract = getContract({
          client,
          chain: base,
          address: tokenAddress,
          abi: zoraNftMintAbi,
        });

        const tx = prepareContractCall({
          contract,
          method: "mintWithRewards",
          params: [address, BigInt(quantity), comment?.trim() || "", MINT_REFERRAL],
          value: totalPrice,
        });

        const result = await sendTransaction({
          account: writer.account,
          transaction: tx,
        });
        const txHash = result.transactionHash as `0x${string}`;

        setMintStatus("pending-tx");
        toast.loading("Transaction submitted!", {
          id: MINT_TOAST_ID,
          description: `Waiting for confirmation... ${txHash.slice(0, 10)}…${txHash.slice(-4)}`,
        });

        await waitForReceipt({ client, chain: base, transactionHash: txHash });

        setMintStatus("success");
        toast.success("Successfully minted!", {
          id: MINT_TOAST_ID,
          description: `Transaction: ${txHash.slice(0, 10)}…${txHash.slice(-4)}`,
          duration: 5000,
        });

        onSuccess?.(txHash);

        setTimeout(() => {
          setMintStatus("idle");
        }, 3000);
      } catch (err: unknown) {
        setMintStatus("error");
        const error = err instanceof Error ? err : new Error("Mint failed");
        const { category, message } = normalizeTxError(error);

        toast.dismiss(MINT_TOAST_ID);

        if (category === "user-rejected") {
          toast.error("Transaction cancelled", {
            description: "You rejected the transaction in your wallet.",
          });
        } else if (message.includes("insufficient funds")) {
          toast.error("Insufficient funds", {
            description: "You don't have enough ETH to complete this purchase.",
          });
        } else if (
          message.includes("Sale_Inactive") ||
          message.includes("sale not active")
        ) {
          toast.error("Sale not active", {
            description: "The sale is not currently active.",
          });
        } else if (message.includes("0x6a1c179e")) {
          toast.error("Invalid configuration", {
            description: "The mint configuration is invalid. Please try again.",
          });
        } else {
          toast.error("Mint failed", {
            description: message.slice(0, 100),
          });
        }

        onError?.(error);

        setTimeout(() => {
          setMintStatus("idle");
        }, 100);
      }
    },
    [isReady, tokenAddress, address, isConnected, writer, priceEth, onSuccess, onError],
  );

  const isPending =
    mintStatus === "confirming-wallet" || mintStatus === "pending-tx";

  return {
    isConnected,
    address,
    isReady,
    isPending,
    isSuccess: mintStatus === "success",
    mintStatus,
    simulateError,
    mint,
  };
}
