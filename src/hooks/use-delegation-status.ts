"use client";

import { useMemo } from "react";
import { type Address, isAddressEqual, zeroAddress } from "viem";
import { useReadContracts } from "wagmi";
import { useUserAddress } from "@/hooks/use-user-address";
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
  /**
   * True when the active thirdweb wallet is wrapped in a smart account —
   * either because a MetaMask (or other external) EOA was wrapped via the
   * `accountAbstraction` config, or because the user is on an inAppWallet
   * session (social/email login) whose active account IS the SA.
   */
  isSmartAccount: boolean;
  /**
   * True when the active wallet is thirdweb's inAppWallet (social / email
   * login). In that case the SA self-delegates by default and there is no
   * externally-controllable admin EOA.
   */
  isInAppWallet: boolean;
  /**
   * The EOA that actually signs transactions — the admin account of a
   * smart-account wrap when present, otherwise the active account itself.
   * For inAppWallet sessions there is no exposed admin signer, so this
   * falls back to the active account (which IS the SA).
   */
  eoaAddress: Address | undefined;
  /**
   * The smart account address when AA is on. For MetaMask + AA wrap this is
   * the SA wrapper; for inAppWallet sessions this is the active account
   * itself (which is the SA by definition). Undefined for pure EOA sessions
   * without AA wrap.
   */
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
   * the migration prompt. Never true for inAppWallet sessions — there the
   * active account IS the SA, so there is no separate EOA to delegate from.
   */
  needsSmartAccountDelegation: boolean;
}

/**
 * Centralized delegation state for the connected user, AA-aware. Reads
 * delegates() and balanceOf() from the Gnars token via wagmi and joins
 * them with the thirdweb wallet shape so consumers can ask one question
 * — "is this user wired up correctly?" — without re-implementing the
 * comparison everywhere.
 *
 * Address sourcing (post Option F):
 *
 *  - `MetaMask + AA wrap`: `address` = SA, `adminAddress` = EOA. We use
 *    the admin as `eoaAddress` (the signer that must delegate) and the
 *    active account as `smartAccountAddress`.
 *
 *  - `inAppWallet` (social/email): the active account IS the SA and there
 *    is no externally-controllable admin signer. We set both `eoaAddress`
 *    and `smartAccountAddress` to the active account. `needs…Delegation`
 *    is forced to `false` because the SA self-delegates by default.
 *
 *  - `Pure EOA without AA wrap` (shouldn't happen after Option F but
 *    handled defensively): `address` = EOA, `adminAddress` is undefined.
 *    We treat the active account as the EOA and leave
 *    `smartAccountAddress` undefined. `isSmartAccount` is false.
 */
export function useDelegationStatus(): DelegationStatus {
  // Always use the raw SA / admin addresses — never the view-filtered
  // `address`. The delegation flow needs to see both sides regardless of
  // which one the user is "viewing as" in the wallet panel.
  const { saAddress: activeAddress, adminAddress, isInAppWallet } = useUserAddress();

  const eoaAddress: Address | undefined = adminAddress ?? activeAddress;
  const isSmartAccount = Boolean(adminAddress) || isInAppWallet;
  // SA address == active account whenever the session is smart-wrapped
  // (either an AA-wrapped external wallet OR an inAppWallet).
  const smartAccountAddress: Address | undefined = isSmartAccount
    ? activeAddress
    : undefined;

  const enabled = Boolean(eoaAddress);
  // Always pass three reads so wagmi keeps a stable contracts shape.
  // The SA balance call falls back to the EOA address when AA is off;
  // we ignore that result (smartAccountAddress check below) so the value
  // is never surfaced.
  const balanceLookupAddress = smartAccountAddress ?? eoaAddress;

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: DAO_ADDRESSES.token as Address,
        abi: tokenAbi,
        functionName: "delegates",
        args: enabled && eoaAddress ? [eoaAddress] : undefined,
        chainId: CHAIN.id,
      },
      {
        address: DAO_ADDRESSES.token as Address,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: enabled && eoaAddress ? [eoaAddress] : undefined,
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
        isInAppWallet,
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
      currentDelegate !== undefined && !isAddressEqual(currentDelegate, zeroAddress);

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

    // For inAppWallet sessions the EOA and SA are the same account — there
    // is no separate EOA holding Gnars to delegate from, so the migration
    // prompt should never fire. We gate on `adminAddress`-backed wraps only.
    const needsSmartAccountDelegation =
      Boolean(adminAddress) && hasEoaTokens && !isDelegatedToSmartAccount;

    return {
      isLoading,
      isSmartAccount,
      isInAppWallet,
      eoaAddress,
      smartAccountAddress,
      currentDelegate,
      isDelegatedToSelf,
      isDelegatedToSmartAccount,
      isDelegatedElsewhere,
      eoaTokenBalance,
      smartAccountTokenBalance,
      needsSmartAccountDelegation,
    };
  }, [
    eoaAddress,
    smartAccountAddress,
    isSmartAccount,
    isInAppWallet,
    adminAddress,
    isLoading,
    data,
  ]);
}
