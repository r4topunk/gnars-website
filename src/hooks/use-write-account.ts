"use client";

import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import type { Account, Wallet } from "thirdweb/wallets";
import { useUserAddress } from "@/hooks/use-user-address";

export interface WriteAccount {
  /** The account object to pass to thirdweb's `sendTransaction`. */
  account: Account;
  /** The active thirdweb wallet — exposed for chain-ensure calls. */
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
  const { viewMode, canSwitchView } = useUserAddress();

  if (!wallet || !activeAccount) return undefined;

  if (viewMode === "eoa" && canSwitchView) {
    const admin = wallet.getAdminAccount?.();
    if (admin) {
      return { account: admin, wallet, isEoaSigner: true };
    }
  }

  return { account: activeAccount, wallet, isEoaSigner: false };
}
