"use client";

import { useActiveAccount, useActiveWallet, useAdminWallet } from "thirdweb/react";
import type { Account, Wallet } from "thirdweb/wallets";
import { useUserAddress } from "@/hooks/use-user-address";

export interface WriteAccount {
  /** The account object to pass to thirdweb's `sendTransaction`. */
  account: Account;
  /**
   * The wallet that must be on the target chain before signing. For EOA
   * signing this is the admin wallet (the external provider that actually
   * broadcasts the tx); for SA signing it's the active wallet. Callers
   * should pass this to `ensureOnChain`.
   *
   * Using the active wallet unconditionally hides chain mismatches because
   * the SA wrapper is pinned to Base by `THIRDWEB_AA_CONFIG` — so the chain
   * check always returned "already on Base" while the admin EOA stayed on
   * mainnet and signed there. That caused propdate txs to land on Ethereum.
   */
  wallet: Wallet;
  /**
   * True when the returned account is the admin EOA (i.e. the write will
   * be signed directly by the external wallet, not bundled into a userop).
   * Callers can surface different UI copy or skip AA-specific logic.
   */
  isEoaSigner: boolean;
}

/**
 * Returns the account that should sign write transactions, based on the
 * user's current view mode:
 *
 * - **"eoa" view** (default for external wallets that expose a distinct
 *   admin EOA): sign from the admin EOA directly. Real wallet
 *   "Confirm Transaction" prompt, user pays gas, tx hash shown in the
 *   wallet is the real onchain hash.
 * - **"sa" view** (default for inAppWallet / pure EOA sessions, or
 *   opt-in for external wallets): sign from the active account, which
 *   under `accountAbstraction` is the SA. Sponsored gas via the thirdweb
 *   bundler. Users see a "Sign Message" popup (the userop hash).
 *
 * Returns `undefined` when no wallet is connected, letting callers early
 * return with a "connect wallet first" toast.
 *
 * Usage:
 * ```ts
 * const writer = useWriteAccount();
 * if (!writer) return;
 * await ensureOnChain(writer.wallet, base);
 * const result = await sendTransaction({
 *   account: writer.account,
 *   transaction: tx,
 * });
 * ```
 *
 * Most write hooks should call this instead of `useSendTransaction()`
 * from `thirdweb/react`, which always signs from the active account and
 * ignores view mode.
 */
export function useWriteAccount(): WriteAccount | undefined {
  const activeAccount = useActiveAccount();
  const wallet = useActiveWallet();
  const adminWallet = useAdminWallet();
  const { viewMode, canSwitchView } = useUserAddress();

  if (!wallet || !activeAccount) return undefined;

  if (viewMode === "eoa" && canSwitchView) {
    const admin = wallet.getAdminAccount?.();
    if (admin && adminWallet) {
      return { account: admin, wallet: adminWallet, isEoaSigner: true };
    }
  }

  return { account: activeAccount, wallet, isEoaSigner: false };
}
