"use client";

import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Address, isAddress, parseEther } from "viem";
import {
  useAccount,
  useBalance,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
} from "wagmi";
import { base } from "wagmi/chains";
import { useAllowedNft } from "@/hooks/use-allowed-nft";
import { CHAIN } from "@/lib/config";
import {
  erc20BalanceAbi,
  GNARS_NFT_ADDRESS,
  GNARS_TOKEN_ADDRESS,
  TEST_NFT_ADDRESS,
  ZERO_ADDRESS,
} from "@/lib/lootbox";
import erc20Abi from "@/utils/abis/erc20Abi";
import gnarsLootboxV4Abi from "@/utils/abis/gnarsLootboxV4Abi";

interface UseLootboxContractOptions {
  lootboxAddress: Address;
  flexEth: string;
  pendingHash: `0x${string}` | undefined;
  allowlistNft?: string;
  nftContract?: string;
  withdrawNftAddress?: string;
  withdrawTokenAddress?: string;
  retryRequestId?: string;
  cancelRequestId?: string;
  onTransactionError?: () => void;
  onTransactionConfirmed?: () => void;
}

export function useLootboxContract({
  lootboxAddress,
  flexEth,
  pendingHash,
  allowlistNft = "",
  nftContract = "",
  withdrawNftAddress = "",
  withdrawTokenAddress = "",
  retryRequestId = "",
  cancelRequestId = "",
  onTransactionError,
  onTransactionConfirmed,
}: UseLootboxContractOptions) {
  const { address, isConnected, chain } = useAccount();
  const seenFlexEvents = useRef<Set<string>>(new Set());

  // Reset seen events when lootbox address changes
  useEffect(() => {
    seenFlexEvents.current.clear();
  }, [lootboxAddress]);

  const flexValue = useMemo(() => {
    try {
      return parseEther(flexEth || "0");
    } catch {
      return 0n;
    }
  }, [flexEth]);

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isTransactionError,
  } = useWaitForTransactionReceipt({
    hash: pendingHash,
    chainId: CHAIN.id,
  });

  // Main contract data reads
  const { data, refetch, isFetching } = useReadContracts({
    contracts: [
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "owner" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "treasury" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "subscriptionId" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "keyHash" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "callbackGasLimit" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "requestConfirmations" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "numWords" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "minFlexEth" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "flexNothingBps" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "flexNftBpsMin" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "flexNftBpsMax" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "flexNftBpsPerEth" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "flexGnarsBase" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "flexGnarsPerEth" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "gnarsUnit" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "gnarsToken" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "paused" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "getFlexBalances" },
      { address: lootboxAddress, abi: gnarsLootboxV4Abi, functionName: "flexNftsLength" },
    ],
    query: {
      refetchInterval: false,
      staleTime: 30_000,
      gcTime: 60_000,
    },
  });

  const gnarsTokenAddress = useMemo(() => {
    const token = data?.[15]?.result;
    if (typeof token === "string" && isAddress(token)) {
      return token as Address;
    }
    return GNARS_TOKEN_ADDRESS;
  }, [data]);

  // Handle transaction errors
  useEffect(() => {
    if (isTransactionError && pendingHash) {
      toast.error("Transaction failed", {
        description: "The transaction failed on chain. Please try again.",
      });
      onTransactionError?.();
    }
  }, [isTransactionError, pendingHash, onTransactionError]);

  // Refetch balances when transaction confirms
  useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        refetch();
      }, 2000);
      onTransactionConfirmed?.();
    }
  }, [isConfirmed, refetch, onTransactionConfirmed]);

  // Flex preview data
  const { data: flexPreviewData } = useReadContract({
    address: lootboxAddress,
    abi: gnarsLootboxV4Abi,
    functionName: "getFlexPreview",
    args: [flexValue > 0n ? flexValue : parseEther("0.0002")],
    query: {
      enabled: true,
      placeholderData: (previousData) => previousData,
    },
  });

  // Token balances
  const { data: contractGnarsBalance } = useReadContract({
    address: gnarsTokenAddress,
    abi: erc20BalanceAbi,
    functionName: "balanceOf",
    args: [lootboxAddress],
  });

  const { data: walletGnarsBalance } = useReadContract({
    address: gnarsTokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? ZERO_ADDRESS],
    query: { enabled: Boolean(address) },
  });

  const { data: gnarsAllowance } = useReadContract({
    address: gnarsTokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address ?? ZERO_ADDRESS, lootboxAddress],
    query: { enabled: Boolean(address) },
  });

  // Flex NFTs
  const { data: flexNftsLength } = useReadContract({
    address: lootboxAddress,
    abi: gnarsLootboxV4Abi,
    functionName: "flexNftsLength",
  });

  const flexNftContracts = useMemo(() => {
    if (!flexNftsLength || flexNftsLength === 0n) return [];
    const length = Number(flexNftsLength);
    if (!Number.isFinite(length) || length <= 0) return [];
    return Array.from({ length }, (_, index) => ({
      address: lootboxAddress,
      abi: gnarsLootboxV4Abi,
      functionName: "getFlexNft",
      args: [BigInt(index)],
    }));
  }, [flexNftsLength, lootboxAddress]);

  const { data: flexNftItems } = useReadContracts({
    contracts: flexNftContracts,
    query: { enabled: flexNftContracts.length > 0 },
  });

  const flexNftCounts = useMemo(() => {
    let gnars = 0;
    let hacker = 0;
    let total = 0;
    const gnarsAddress = GNARS_NFT_ADDRESS.toLowerCase();
    const hackerAddress = TEST_NFT_ADDRESS.toLowerCase();

    (flexNftItems ?? []).forEach((item) => {
      const result = item?.result as readonly [Address, bigint, boolean] | undefined;
      if (!result) return;
      const [nft, , consumed] = result;
      if (consumed) return;
      total += 1;
      const nftAddress = nft.toLowerCase();
      if (nftAddress === gnarsAddress) {
        gnars += 1;
      } else if (nftAddress === hackerAddress) {
        hacker += 1;
      }
    });

    return { gnars, hacker, total };
  }, [flexNftItems]);

  const flexNftCountsReady = flexNftContracts.length === 0 || flexNftItems !== undefined;

  // ETH balance
  const { data: lootboxEthBalance } = useBalance({
    address: lootboxAddress,
    chainId: base.id,
  });

  // Allowlist status
  const { data: allowlistStatus } = useAllowedNft(lootboxAddress, allowlistNft);
  const { data: depositNftStatus } = useAllowedNft(lootboxAddress, nftContract);
  const { data: withdrawNftStatus } = useAllowedNft(lootboxAddress, withdrawNftAddress);

  // Withdraw token balance
  const withdrawTokenIsValid = isAddress(withdrawTokenAddress);
  const { data: withdrawTokenBalance } = useReadContract({
    address: withdrawTokenIsValid ? (withdrawTokenAddress as Address) : ZERO_ADDRESS,
    abi: erc20BalanceAbi,
    functionName: "balanceOf",
    args: [lootboxAddress],
    query: { enabled: withdrawTokenIsValid },
  });

  // Pending open data
  const activeRequestId = useMemo(() => {
    const candidate = retryRequestId || cancelRequestId;
    if (!candidate) return null;
    try {
      return BigInt(candidate);
    } catch {
      return null;
    }
  }, [retryRequestId, cancelRequestId]);

  const { data: pendingOpenData } = useReadContract({
    address: lootboxAddress,
    abi: gnarsLootboxV4Abi,
    functionName: "pendingOpens",
    args: activeRequestId !== null ? [activeRequestId] : undefined,
    query: { enabled: activeRequestId !== null },
  });

  const pendingOpen = useMemo(() => {
    if (!pendingOpenData) return null;
    const result = pendingOpenData as {
      user?: Address;
      paid?: bigint;
      flexGnarsPayout?: bigint;
      flexNothingBps?: number;
      flexNftBps?: number;
      fulfilled?: boolean;
      flexNftReserved?: boolean;
      0?: Address;
      1?: bigint;
      2?: bigint;
      3?: number;
      4?: number;
      5?: boolean;
      6?: boolean;
    };
    return {
      user: result.user ?? result[0] ?? ZERO_ADDRESS,
      paid: result.paid ?? result[1] ?? 0n,
      flexGnarsPayout: result.flexGnarsPayout ?? result[2] ?? 0n,
      flexNothingBps: result.flexNothingBps ?? result[3] ?? 0,
      flexNftBps: result.flexNftBps ?? result[4] ?? 0,
      fulfilled: result.fulfilled ?? result[5] ?? false,
      flexNftReserved: result.flexNftReserved ?? result[6] ?? false,
    };
  }, [pendingOpenData]);

  // Watch for FlexOpened events
  useWatchContractEvent({
    address: lootboxAddress,
    abi: gnarsLootboxV4Abi,
    eventName: "FlexOpened",
    chainId: base.id,
    enabled: Boolean(address),
    onLogs: (logs) => {
      logs.forEach((log) => {
        const key = `${log.transactionHash}-${log.logIndex}`;
        if (seenFlexEvents.current.has(key)) return;
        seenFlexEvents.current.add(key);

        const args = log.args as
          | {
              user?: Address;
              nft?: Address;
              tokenId?: bigint;
              nothing?: boolean;
            }
          | undefined;
        if (!args?.user || !args?.nft) return;
        if (args.user.toLowerCase() !== address?.toLowerCase()) return;
        if (args.nothing) return;
        if (args.nft === ZERO_ADDRESS) return;

        toast.success("Congrats! You won an NFT.", {
          description: `${args.nft} #${args.tokenId?.toString() ?? "-"}`,
        });
      });
    },
  });

  // Parse contract data
  const [
    owner,
    treasury,
    subscriptionId,
    keyHash,
    callbackGasLimit,
    requestConfirmations,
    numWords,
    minFlexEth,
    flexNothingBps,
    flexNftBpsMin,
    flexNftBpsMax,
    flexNftBpsPerEth,
    flexGnarsBase,
    flexGnarsPerEth,
    gnarsUnit, // Skip gnarsToken - handled separately
    ,
    isPaused,
    flexBalances,
  ] = useMemo(() => {
    return [
      data?.[0]?.result ?? null,
      data?.[1]?.result ?? null,
      data?.[2]?.result ?? 0n,
      data?.[3]?.result ?? null,
      data?.[4]?.result ?? 0n,
      data?.[5]?.result ?? 0n,
      data?.[6]?.result ?? 0n,
      data?.[7]?.result ?? 0n,
      data?.[8]?.result ?? 0n,
      data?.[9]?.result ?? 0n,
      data?.[10]?.result ?? 0n,
      data?.[11]?.result ?? 0n,
      data?.[12]?.result ?? 0n,
      data?.[13]?.result ?? 0n,
      data?.[14]?.result ?? 0n,
      data?.[15]?.result ?? null,
      data?.[16]?.result ?? null,
      data?.[17]?.result ?? null,
    ] as const;
  }, [data]);

  const isOwner = useMemo(() => {
    if (!address || !owner) return false;
    return address.toLowerCase() === (owner as string).toLowerCase();
  }, [address, owner]);

  const canAdmin = isConnected && isOwner;

  const flexStats = flexBalances as readonly [bigint, bigint, bigint] | null;

  // V4: Use dynamic NFT chance from preview
  const previewNftBps = useMemo(() => {
    if (flexPreviewData) {
      const previewResult = flexPreviewData as readonly [number, number, bigint];
      return Number(previewResult[1]);
    }
    return Number(flexNftBpsMin);
  }, [flexPreviewData, flexNftBpsMin]);

  const nothingChance = Number(flexNothingBps) / 100;
  const nftChance = previewNftBps / 100;
  const gnarsChance = Math.max(0, 100 - nothingChance);

  return {
    // Account
    address,
    isConnected,
    chain,

    // Transaction status
    isConfirming,
    isConfirmed,

    // Contract data
    owner,
    treasury,
    subscriptionId,
    keyHash,
    callbackGasLimit,
    requestConfirmations,
    numWords,
    minFlexEth,
    flexNothingBps,
    flexNftBpsMin,
    flexNftBpsMax,
    flexNftBpsPerEth,
    flexGnarsBase,
    flexGnarsPerEth,
    gnarsUnit,
    gnarsTokenAddress,
    isPaused,
    flexStats,

    // Balances
    contractGnarsBalance,
    walletGnarsBalance,
    gnarsAllowance,
    lootboxEthBalance,
    withdrawTokenBalance,

    // NFT counts
    flexNftCounts,
    flexNftCountsReady,

    // Allowlist status
    allowlistStatus,
    depositNftStatus,
    withdrawNftStatus,

    // Pending open
    activeRequestId,
    pendingOpen,

    // Computed values
    flexValue,
    isOwner,
    canAdmin,
    gnarsChance,
    nftChance,
    nothingChance,

    // Actions
    refetch,
    isFetching,
  };
}
