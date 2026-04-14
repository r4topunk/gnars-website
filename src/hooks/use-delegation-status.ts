"use client";

import { useMemo } from "react";
import { type Address, isAddressEqual, zeroAddress } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { useThirdwebWallet } from "@/hooks/use-thirdweb-wallet";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";

const tokenAbi = [
  {
    name: "delegates",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export interface DelegationStatus {
  isLoading: boolean;
  /** True when AA is enabled and the bridge has produced a smart account distinct from the EOA. */
  isSmartAccount: boolean;
  /** The user's EOA — the wallet they connected. */
  eoaAddress: Address | undefined;
  /** The smart account address when AA is on, undefined otherwise. */
  smartAccountAddress: Address | undefined;
  /** Where the EOA's voting power currently flows. */
  currentDelegate: Address | undefined;
  /** Convenience flags for the most common UX branches. */
  isDelegatedToSelf: boolean;
  isDelegatedToSmartAccount: boolean;
  isDelegatedElsewhere: boolean;
  /** Gnars NFT counts on each address. Either may be undefined while loading. */
  eoaTokenBalance: bigint | undefined;
  smartAccountTokenBalance: bigint | undefined;
  /**
   * True when the user holds Gnars at the EOA, AA is on, and the EOA hasn't
   * delegated those Gnars to the smart account yet. This is the trigger for
   * the migration prompt.
   */
  needsSmartAccountDelegation: boolean;
}

/**
 * Centralized delegation state for the connected user, AA-aware. Reads
 * delegates() and balanceOf() from the Gnars token via wagmi and joins
 * them with the bridged thirdweb wallet so consumers can ask one
 * question — "is this user wired up correctly?" — without re-implementing
 * the comparison everywhere.
 */
export function useDelegationStatus(): DelegationStatus {
  const { address: eoaAddress } = useAccount();
  const bridge = useThirdwebWallet();

  const isSmartAccount = bridge.isSmartAccount;
  const smartAccountAddress = isSmartAccount ? (bridge.account?.address as Address | undefined) : undefined;

  const enabled = Boolean(eoaAddress);
  // Always pass three reads so wagmi keeps a stable contracts shape.
  // The SA balance call falls back to the EOA address when AA is off;
  // we ignore that result (smartAccountAddress check below) so the value
  // is never surfaced.
  const balanceLookupAddress = smartAccountAddress ?? (eoaAddress as Address | undefined);

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: DAO_ADDRESSES.token as Address,
        abi: tokenAbi,
        functionName: "delegates",
        args: enabled ? [eoaAddress!] : undefined,
        chainId: CHAIN.id,
      },
      {
        address: DAO_ADDRESSES.token as Address,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: enabled ? [eoaAddress!] : undefined,
        chainId: CHAIN.id,
      },
      {
        address: DAO_ADDRESSES.token as Address,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: enabled && balanceLookupAddress ? [balanceLookupAddress] : undefined,
        chainId: CHAIN.id,
      },
    ],
    query: { enabled, refetchInterval: false },
  });

  return useMemo<DelegationStatus>(() => {
    if (!eoaAddress) {
      return {
        isLoading: false,
        isSmartAccount,
        eoaAddress: undefined,
        smartAccountAddress,
        currentDelegate: undefined,
        isDelegatedToSelf: false,
        isDelegatedToSmartAccount: false,
        isDelegatedElsewhere: false,
        eoaTokenBalance: undefined,
        smartAccountTokenBalance: undefined,
        needsSmartAccountDelegation: false,
      };
    }

    const currentDelegate = (data?.[0]?.result as Address | undefined) ?? undefined;
    const eoaTokenBalance = data?.[1]?.result as bigint | undefined;
    // The third read targets the SA when AA is on; when AA is off it
    // falls back to the EOA address (same as data[1]) and we discard it.
    const smartAccountTokenBalance = smartAccountAddress
      ? (data?.[2]?.result as bigint | undefined)
      : undefined;

    const delegateNotZero =
      currentDelegate !== undefined &&
      !isAddressEqual(currentDelegate, zeroAddress);

    const isDelegatedToSelf =
      delegateNotZero && isAddressEqual(currentDelegate, eoaAddress);

    const isDelegatedToSmartAccount =
      delegateNotZero &&
      smartAccountAddress !== undefined &&
      isAddressEqual(currentDelegate, smartAccountAddress);

    const isDelegatedElsewhere =
      delegateNotZero && !isDelegatedToSelf && !isDelegatedToSmartAccount;

    const hasEoaTokens =
      typeof eoaTokenBalance === "bigint" && eoaTokenBalance > 0n;

    const needsSmartAccountDelegation =
      isSmartAccount && hasEoaTokens && !isDelegatedToSmartAccount;

    return {
      isLoading,
      isSmartAccount,
      eoaAddress: eoaAddress as Address,
      smartAccountAddress,
      currentDelegate,
      isDelegatedToSelf,
      isDelegatedToSmartAccount,
      isDelegatedElsewhere,
      eoaTokenBalance,
      smartAccountTokenBalance,
      needsSmartAccountDelegation,
    };
  }, [eoaAddress, smartAccountAddress, isSmartAccount, isLoading, data]);
}
