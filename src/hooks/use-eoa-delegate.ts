"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
import { useActiveWallet, useAdminWallet } from "thirdweb/react";
import { isAddress, type Address, type Hex } from "viem";
import { DAO_ADDRESSES } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain, normalizeTxError } from "@/lib/thirdweb-tx";

interface UseEoaDelegateArgs {
  onSubmitted?: (txHash: Hex) => void;
  onSuccess?: (txHash: Hex, delegatee: Address) => void;
}

/**
 * Sends a delegate() transaction signed by the underlying EOA — bypassing
 * the smart account wrapper when AA is on. This is the migration tool: an
 * existing Gnars holder needs to delegate the voting power of NFTs that
 * live at their EOA to their newly-created smart account, and the
 * delegate call must therefore originate from the EOA itself.
 *
 * Signer sourcing (post Option F):
 *
 *  - `MetaMask + AA wrap`: `wallet.getAdminAccount()` returns the EOA —
 *    the signer we need. This is the main target of this hook.
 *  - `Pure EOA without AA` (defensive — shouldn't happen after Option F):
 *    `getAdminAccount` is undefined, so we fall back to `wallet.getAccount()`
 *    and delegate from there.
 *  - `inAppWallet`: thirdweb's enclave signer is NOT exposed as an Account,
 *    so there is no externally-controllable EOA to call `delegate()` from.
 *    The hook returns an error toast and a no-op — inAppWallet SAs
 *    self-delegate by default so this path should never be reached anyway.
 */
export function useEoaDelegate({ onSubmitted, onSuccess }: UseEoaDelegateArgs = {}) {
  const wallet = useActiveWallet();
  const adminWallet = useAdminWallet();
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
      if (!wallet) {
        toast.error("Unable to delegate", {
          description: "Connect wallet and try again.",
        });
        return;
      }

      // inAppWallet's admin signer is thirdweb's enclave key — unreachable
      // from the client, and the SA self-delegates by default, so there's
      // nothing for this hook to do. Refuse explicitly so a future UI path
      // that loosens the upstream gate doesn't accidentally sign a delegate
      // tx from the SA itself.
      if (wallet.id === "inApp") {
        toast.error("Delegation not supported", {
          description:
            "Social-login smart accounts self-delegate automatically — no manual delegation is needed.",
        });
        return;
      }

      // Prefer the admin account when the wallet is AA-wrapped. Fall back
      // to the active account for pure EOA sessions.
      const adminAccount = wallet.getAdminAccount?.() ?? wallet.getAccount();
      if (!adminAccount) {
        toast.error("Unable to delegate", {
          description:
            "Your current wallet doesn't expose an external signer for delegation. Switch to a MetaMask-backed smart account if you need to delegate EOA voting power.",
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
        // Switch the underlying wallet's chain explicitly. With AA on the
        // active wallet is the smart wallet (pinned to Base by the AA
        // config), so switching its chain is a no-op and does NOT move the
        // admin EOA provider that actually signs. Use the admin wallet
        // directly so the Zerion / MetaMask chain actually changes.
        await ensureOnChain(adminWallet ?? wallet, base);

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
          account: adminAccount,
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
    [wallet, adminWallet, onSubmitted, onSuccess],
  );

  return {
    delegate,
    isPending,
    isConfirming,
    isConfirmed,
    pendingHash,
  };
}
