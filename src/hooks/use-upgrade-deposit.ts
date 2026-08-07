"use client";

/**
 * Gnars Migration — Upgrader deposit & claim.
 *
 * The presale terminal. You park your deposit currency in the Upgrader (WETH for
 * the presale lane, old $gnars for the dust-migration lane); at launch (TGE) the
 * operator sells every deposit in one batch buy and deploys the new WETH-paired
 * $gnars on Clanker; then you claim pro-rata to your share of the proceeds.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PLUG-AND-PLAY SEAM — three inputs from the operator (@kompreni / Onchain Inc)
 * light this up; the UI, copy, gating and terms are already in place:
 *
 *   1. NEXT_PUBLIC_MIGRATION_UPGRADE_ID — the scheduled upgrade id (`schedule`).
 *      Sets `MIGRATION_UPGRADE_ID`; until then `isMigrationDepositLive()` is
 *      false and the deposit CTA stays gated ("opens at launch").
 *
 *   2. Confirm the deposit signature against the dumped Upgrader ABI. We model
 *      `deposit(uint256 id, address user, address token, uint256 amount, bool
 *      donation)` and `claim(uint256 id, address user)` from the handoff notes —
 *      verify the exact types/order before going live.
 *
 *   3. NEXT_PUBLIC_MIGRATION_DEPOSIT_ENTRYPOINT — the ATOMIC swap-and-deposit
 *      entrypoint we asked the operator to expose, so a consolidated swap lands
 *      straight in the deposit with no wallet intermediate (this is what makes
 *      it a real presale, not a public batch-swap). Until provided, only
 *      `deposit()` of already-held WETH/$gnars is wired — see `swapAndDeposit`.
 * ────────────────────────────────────────────────────────────────────────────
 */
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  getContract,
  prepareContractCall,
  sendTransaction,
  waitForReceipt,
} from "thirdweb";
import { base } from "thirdweb/chains";
import type { Address, Hex } from "viem";
import { useWriteAccount } from "@/hooks/use-write-account";
import {
  MIGRATION_DEPOSIT_ENTRYPOINT,
  MIGRATION_UPGRADE_ID,
  UPGRADER_ADDRESS,
} from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain, normalizeTxError } from "@/lib/thirdweb-tx";

/** Which lane the deposit currency corresponds to. */
export type DepositToken = { address: Address; symbol: string };

export interface DepositArgs {
  /** The token to deposit (WETH for the presale lane, old $gnars for migration). */
  token: DepositToken;
  /** Raw amount (wei) to deposit. */
  amount: bigint;
  /** Operator's `donation` flag — surplus routed to the DAO rather than claimed back. */
  donation?: boolean;
}

export function useUpgradeDeposit() {
  const writer = useWriteAccount();
  const [isRunning, setIsRunning] = useState(false);
  const [txHash, setTxHash] = useState<Hex | undefined>(undefined);

  const upgraderContract = useCallback(() => {
    const client = getThirdwebClient();
    if (!client) throw new Error("Thirdweb client not configured");
    return getContract({ client, chain: base, address: UPGRADER_ADDRESS as Address });
  }, []);

  /**
   * Plain deposit of an already-held token (WETH or old $gnars): approve the
   * Upgrader to pull it, then `deposit(id, user, token, amount, donation)`.
   */
  const deposit = useCallback(
    async ({ token, amount, donation = false }: DepositArgs): Promise<boolean> => {
      if (MIGRATION_UPGRADE_ID == null) {
        toast.error("Deposits open at launch");
        return false;
      }
      if (!writer) {
        toast.error("Please connect your wallet");
        return false;
      }
      if (amount <= 0n) {
        toast.error("Enter an amount to deposit");
        return false;
      }

      const client = getThirdwebClient();
      if (!client) {
        toast.error("Thirdweb client not configured");
        return false;
      }

      setIsRunning(true);
      const toastId = toast.loading("Depositing into the migration…");
      try {
        await ensureOnChain(writer.wallet, base);
        const user = writer.account.address as Address;

        // 1) Approve the Upgrader to pull the deposit token.
        const tokenContract = getContract({ client, chain: base, address: token.address });
        const approveTx = prepareContractCall({
          contract: tokenContract,
          method: "function approve(address spender, uint256 amount) returns (bool)",
          params: [UPGRADER_ADDRESS as Address, amount],
        });
        await sendTransaction({ account: writer.account, transaction: approveTx });

        // 2) Deposit. Signature per handoff notes — confirm vs dumped ABI (seam #2).
        const depositTx = prepareContractCall({
          contract: upgraderContract(),
          method:
            "function deposit(uint256 id, address user, address token, uint256 amount, bool donation)",
          params: [MIGRATION_UPGRADE_ID, user, token.address, amount, donation],
        });
        const result = await sendTransaction({ account: writer.account, transaction: depositTx });
        const hash = result.transactionHash as Hex;
        setTxHash(hash);

        await waitForReceipt({ client, chain: base, transactionHash: hash });
        toast.success("Deposited into the migration", { id: toastId });
        return true;
      } catch (err) {
        const { message } = normalizeTxError(err);
        toast.error(message || "Deposit failed", { id: toastId });
        return false;
      } finally {
        setIsRunning(false);
      }
    },
    [writer, upgraderContract],
  );

  /** Claim the new $gnars after the operator runs the batch: `claim(id, user)`. */
  const claim = useCallback(async (): Promise<boolean> => {
    if (MIGRATION_UPGRADE_ID == null) {
      toast.error("Nothing to claim yet");
      return false;
    }
    if (!writer) {
      toast.error("Please connect your wallet");
      return false;
    }
    const client = getThirdwebClient();
    if (!client) {
      toast.error("Thirdweb client not configured");
      return false;
    }

    setIsRunning(true);
    const toastId = toast.loading("Claiming your new $gnars…");
    try {
      await ensureOnChain(writer.wallet, base);
      const user = writer.account.address as Address;
      const claimTx = prepareContractCall({
        contract: upgraderContract(),
        method: "function claim(uint256 id, address user)",
        params: [MIGRATION_UPGRADE_ID, user],
      });
      const result = await sendTransaction({ account: writer.account, transaction: claimTx });
      const hash = result.transactionHash as Hex;
      setTxHash(hash);
      await waitForReceipt({ client, chain: base, transactionHash: hash });
      toast.success("Claimed your new $gnars!", { id: toastId });
      return true;
    } catch (err) {
      const { message } = normalizeTxError(err);
      toast.error(message || "Claim failed", { id: toastId });
      return false;
    } finally {
      setIsRunning(false);
    }
  }, [writer, upgraderContract]);

  /**
   * ATOMIC swap-and-deposit (seam #3). Blocked until the operator exposes an
   * entrypoint that takes the swap output (or msg.value) and credits
   * `deposit(id, msg.sender, …)` in the same call — reading the received amount
   * so we don't need to know the post-swap amount in advance. When the entrypoint
   * + its ABI land, wire the batch here: [consolidate swap → entrypoint call].
   */
  const swapAndDeposit = useCallback(async (): Promise<boolean> => {
    if (!MIGRATION_DEPOSIT_ENTRYPOINT) {
      toast.error("Atomic deposit not available yet — using consolidate + deposit for now");
      return false;
    }
    // TODO(plug-and-play): encode the operator's swap-and-deposit entrypoint call
    // and bundle it after the consolidation swaps once the ABI is provided.
    toast.error("swapAndDeposit not wired — awaiting operator entrypoint ABI");
    return false;
  }, []);

  return { deposit, claim, swapAndDeposit, isRunning, txHash };
}
