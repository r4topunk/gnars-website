"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { type Address, type Hex, isAddress } from "viem";
import {
  getContract,
  prepareContractCall,
  sendTransaction,
  waitForReceipt,
} from "thirdweb";
import { base } from "thirdweb/chains";
import { useThirdwebWallet } from "@/hooks/use-thirdweb-wallet";
import { DAO_ADDRESSES } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain, normalizeTxError } from "@/lib/thirdweb-tx";

interface UseEoaDelegateArgs {
  onSubmitted?: (txHash: Hex) => void;
  onSuccess?: (txHash: Hex, delegatee: Address) => void;
}

/**
 * Sends a delegate() transaction signed by the connected EOA — bypassing
 * the smart account wrapper when AA is on. This is the migration tool: an
 * existing Gnars holder needs to delegate the voting power of NFTs that
 * live at their EOA to their newly-created smart account, and the
 * delegate call must therefore originate from the EOA itself.
 *
 * When AA is off this hook behaves like useDelegate (admin account ===
 * active account === EOA), so it's safe to call regardless of mode.
 */
export function useEoaDelegate({ onSubmitted, onSuccess }: UseEoaDelegateArgs = {}) {
  const bridge = useThirdwebWallet();
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [pendingHash, setPendingHash] = useState<Hex | undefined>(undefined);

  const delegate = useCallback(
    async (delegatee: string) => {
      const client = getThirdwebClient();
      if (!client) {
        toast.error("Unable to delegate", {
          description: "Thirdweb client not configured.",
        });
        return;
      }
      if (!bridge.adminAccount || !bridge.adminWallet) {
        toast.error("Unable to delegate", {
          description: "Connect wallet and try again.",
        });
        return;
      }
      if (!isAddress(delegatee)) {
        toast.error("Invalid address", {
          description: "Please enter a valid Ethereum address.",
        });
        return;
      }

      setPendingHash(undefined);
      setIsConfirming(false);
      setIsConfirmed(false);
      setIsPending(true);

      try {
        // Switch the underlying EOA wallet's chain explicitly. With AA on
        // the active wallet is the smart wallet; switching its chain does
        // not propagate down to the EIP1193 provider that actually signs.
        await ensureOnChain(bridge.adminWallet, base);

        const contract = getContract({
          client,
          chain: base,
          address: DAO_ADDRESSES.token as Address,
        });

        const tx = prepareContractCall({
          contract,
          method: "function delegate(address delegatee)",
          params: [delegatee as Address],
        });

        const result = await sendTransaction({
          account: bridge.adminAccount,
          transaction: tx,
        });
        const txHash = result.transactionHash as Hex;

        setPendingHash(txHash);
        setIsPending(false);
        onSubmitted?.(txHash);

        toast("Delegation submitted", {
          description: `Transaction: ${txHash.slice(0, 10)}…${txHash.slice(-4)}`,
        });

        setIsConfirming(true);
        await waitForReceipt({
          client,
          chain: base,
          transactionHash: txHash,
        });
        setIsConfirming(false);
        setIsConfirmed(true);

        onSuccess?.(txHash, delegatee as Address);
      } catch (err) {
        setIsPending(false);
        setIsConfirming(false);
        const { category, message } = normalizeTxError(err);
        if (category === "user-rejected") {
          toast.error("Delegation cancelled", {
            description: "You cancelled the transaction.",
          });
          return;
        }
        if (message.toLowerCase().includes("reverted")) {
          toast.error("Delegation failed", {
            description: "The transaction was reverted. You may not own any tokens to delegate.",
          });
          return;
        }
        toast.error("Delegation failed", { description: message });
      }
    },
    [bridge.adminAccount, bridge.adminWallet, onSubmitted, onSuccess],
  );

  return {
    delegate,
    isPending,
    isConfirming,
    isConfirmed,
    pendingHash,
  };
}
