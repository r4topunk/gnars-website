"use client";

import { useActiveAccount, useActiveWallet, useAdminWallet } from "thirdweb/react";
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
  const adminWallet = useAdminWallet();
  // Detect inAppWallet sessions via the ADMIN wallet, not the active one.
  // When `accountAbstraction` is enabled at the modal level, thirdweb
  // wraps every chosen wallet in a SmartWallet, so `useActiveWallet().id`
  // is always `"smart"` — even for social logins. The underlying wallet
  // (reachable through `useAdminWallet`) is what distinguishes an inApp
  // session from a MetaMask / Zerion / Coinbase one.
  const isInAppWallet = adminWallet?.id === "inApp" || wallet?.id === "inApp";
  // For inAppWallet sessions the "admin account" is thirdweb's enclave
  // signer — an internal implementation detail the user has no awareness
  // of. Treating it as a user-facing admin EOA would confuse the wallet
  // panel (extra "Admin" row, view-as toggle), default the app into a
  // fake EOA view, and most importantly route writes through an account
  // that bypasses the SA wrap — breaking sponsored gas and tx semantics.
  // Only surface the admin for external wallets (MetaMask / Zerion / etc.)
  // where `getAdminAccount` actually points at the user's own EOA.
  const admin = isInAppWallet ? undefined : wallet?.getAdminAccount?.();
  const { viewMode: storedViewMode } = useViewAccount();

  const saAddress = account?.address as Address | undefined;
  const adminAddress = admin?.address as Address | undefined;
  const canSwitchView = Boolean(saAddress && adminAddress && saAddress !== adminAddress);

  // External-wallet users (MetaMask, Zerion, Coinbase, etc.) default to
  // viewing as their EOA because that's where their Gnars actually live
  // and it's the address they recognize. inAppWallet / pure-EOA users
  // default to the active account. Explicit toggles override the default.
  const effectiveViewMode: ViewMode =
    storedViewMode ?? (canSwitchView ? "eoa" : "sa");

  const effectiveAddress: Address | undefined =
    effectiveViewMode === "eoa" && canSwitchView ? adminAddress : saAddress;

  return {
    address: effectiveAddress,
    saAddress,
    adminAddress,
    isConnected: Boolean(account),
    isInAppWallet,
    viewMode: effectiveViewMode,
    canSwitchView,
  };
}
