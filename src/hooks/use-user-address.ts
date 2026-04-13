"use client";

import { useAccount } from "wagmi";
import { useActiveAccount } from "thirdweb/react";
import type { Address } from "viem";

export interface UseUserAddressResult {
  address: Address | undefined;
  isConnected: boolean;
  source: "thirdweb" | "wagmi" | undefined;
}

/**
 * Returns the user's effective address, preferring thirdweb's active
 * account (which reflects the smart account when AA is enabled) and
 * falling back to wagmi's connected EOA. Read hooks that need to
 * query "the user's stuff" should use this instead of wagmi's
 * useAccount() so that smart-account holdings are read from the
 * correct address once account abstraction is turned on.
 */
export function useUserAddress(): UseUserAddressResult {
  const thirdwebAccount = useActiveAccount();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();

  if (thirdwebAccount?.address) {
    return {
      address: thirdwebAccount.address as Address,
      isConnected: true,
      source: "thirdweb",
    };
  }

  if (wagmiConnected && wagmiAddress) {
    return {
      address: wagmiAddress,
      isConnected: true,
      source: "wagmi",
    };
  }

  return {
    address: undefined,
    isConnected: false,
    source: undefined,
  };
}
