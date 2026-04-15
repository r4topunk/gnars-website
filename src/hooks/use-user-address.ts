"use client";

import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import type { Address } from "viem";

export interface UseUserAddressResult {
  /**
   * The effective user address — the smart account when AA is on, otherwise
   * the same as `adminAddress`. This is the address the rest of the app
   * should pass to onchain reads ("show me this user's Gnars").
   */
  address: Address | undefined;
  /**
   * The admin EOA when the active wallet is a smart-account wrap (e.g.
   * MetaMask wrapped by our SA config). Undefined for inAppWallet sessions
   * since thirdweb's enclave signer is not exposed as an account.
   */
  adminAddress: Address | undefined;
  /** Any thirdweb account is active. */
  isConnected: boolean;
  /**
   * True when the active wallet was connected via thirdweb's in-app social /
   * email login. Used by the drawer to gate the "Manage account" button,
   * which only makes sense for linkable enclave-backed sessions.
   */
  isInAppWallet: boolean;
}

/**
 * Single source of truth for the user's connected address. Reads directly
 * from thirdweb's hooks — wagmi's `useAccount` is not used here because
 * the Option F refactor removed all wagmi connectors. Any read path that
 * needs "the user's current address" should go through this hook.
 */
export function useUserAddress(): UseUserAddressResult {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const admin = wallet?.getAdminAccount?.();

  return {
    address: account?.address as Address | undefined,
    adminAddress: admin?.address as Address | undefined,
    isConnected: Boolean(account),
    isInAppWallet: wallet?.id === "inApp",
  };
}
