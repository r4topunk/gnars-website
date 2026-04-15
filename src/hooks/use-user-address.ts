"use client";

import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import type { Address } from "viem";
import { useViewAccount, type ViewMode } from "@/components/layout/ViewAccountContext";

export interface UseUserAddressResult {
  /**
   * The effective user address for read hooks. Reflects the current
   * `viewMode` — the smart account by default, or the admin EOA when the
   * user toggles "view as EOA" in the wallet panel. Writes still flow
   * through thirdweb's active account (always the SA); this field only
   * controls what reads key off.
   */
  address: Address | undefined;
  /**
   * The smart account address, regardless of view mode. This is the
   * thirdweb-active account and the signer of all transactions.
   */
  saAddress: Address | undefined;
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
  /** Current view mode — "sa" (default) or "eoa". */
  viewMode: ViewMode;
  /**
   * True when the active wallet exposes a distinct admin EOA (i.e. the
   * switch account button should be shown).
   */
  canSwitchView: boolean;
}

/**
 * Single source of truth for the user's connected address. Reads directly
 * from thirdweb's hooks — wagmi's `useAccount` is not used here because
 * the Option F refactor removed all wagmi connectors.
 *
 * Honors the `viewMode` from `ViewAccountContext` so components that key
 * their reads off `address` automatically re-query when the user toggles
 * "view as" in the wallet panel. Writes are unaffected — they should use
 * `useActiveAccount()` from thirdweb directly (which write hooks already
 * do through `useSendTransaction`).
 */
export function useUserAddress(): UseUserAddressResult {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const admin = wallet?.getAdminAccount?.();
  const { viewMode } = useViewAccount();

  const saAddress = account?.address as Address | undefined;
  const adminAddress = admin?.address as Address | undefined;
  const canSwitchView = Boolean(saAddress && adminAddress && saAddress !== adminAddress);

  const effectiveAddress: Address | undefined =
    viewMode === "eoa" && canSwitchView ? adminAddress : saAddress;

  return {
    address: effectiveAddress,
    saAddress,
    adminAddress,
    isConnected: Boolean(account),
    isInAppWallet: wallet?.id === "inApp",
    viewMode,
    canSwitchView,
  };
}
