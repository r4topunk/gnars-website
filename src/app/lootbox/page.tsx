"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coins, Upload } from "lucide-react";
import { Address, formatEther, isAddress, parseEther } from "viem";
import { base } from "wagmi/chains";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWatchContractEvent,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHAIN } from "@/lib/config";
import gnarsLootboxV4Abi from "@/utils/abis/gnarsLootboxV4Abi";
import erc20Abi from "@/utils/abis/erc20Abi";
import erc721Abi from "@/utils/abis/erc721Abi";
import { ReadItem, AddressRenderer, Experience3DTab, JoinDAOTab } from "@/components/lootbox";
import { useAllowedNft } from "@/hooks/use-allowed-nft";
import {
  DEFAULT_LOOTBOX_ADDRESS,
  GNARS_TOKEN_ADDRESS,
  GNARS_NFT_ADDRESS,
  TEST_NFT_ADDRESS,
  ZERO_ADDRESS,
  CUSTOM_PRESET,
  NFT_PRESETS,
  TOKEN_PRESETS,
  erc20BalanceAbi,
  formatGnarsAmount,
  parseGnarsInput,
  matchPreset,
  formatPresetLabel,
  normalizeAddress,
  formatOptional,
  formatAllowlistStatus,
} from "@/lib/lootbox";

// Gnarly rejection messages for when users chicken out 🐔
const GNARLY_REJECTION_MESSAGES = [
  { title: "Paper hands detected! 📄🙌", description: "The lootbox sensed your fear and retreated..." },
  { title: "Bailed on the gnarliest drop?", description: "Even the skatepark pigeons are judging you rn" },
  { title: "Transaction rejected!", description: "Your wallet said 'nah' but your heart said 'send it' 🛹" },
  { title: "Chickened out? 🐔", description: "The box will remember this betrayal..." },
  { title: "Skill issue detected", description: "Real gnars don't hesitate on the drop-in" },
  { title: "Cold feet? ❄️🦶", description: "Maybe try rollerblading instead?" },
  { title: "Rejected?! In THIS economy?", description: "The lootbox is crying rn (it's not, but still)" },
  { title: "You folded harder than a lawn chair", description: "The gnars community felt that one 💀" },
];

const getGnarlyRejectionMessage = () => {
  return GNARLY_REJECTION_MESSAGES[Math.floor(Math.random() * GNARLY_REJECTION_MESSAGES.length)];
};

const isUserRejection = (error: unknown): boolean => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("user denied") || 
           msg.includes("user rejected") || 
           msg.includes("rejected the request") ||
           msg.includes("user cancelled");
  }
  return false;
};

export default function LootboxPage() {
  const { address, isConnected, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: base.id });
  const [lootboxAddress, setLootboxAddress] = useState<Address>(DEFAULT_LOOTBOX_ADDRESS);
  const [lootboxAddressInput, setLootboxAddressInput] = useState<string>(DEFAULT_LOOTBOX_ADDRESS);
  const [flexEth, setFlexEth] = useState("0.0002");
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  // Admin deposit states
  const [nftContract, setNftContract] = useState("");
  const [nftTokenId, setNftTokenId] = useState("");
  const [gnarsAmount, setGnarsAmount] = useState("");
  const [allowlistNft, setAllowlistNft] = useState("");
  const [allowlistEnabled, setAllowlistEnabled] = useState(true);
  const [approveGnarsAmount, setApproveGnarsAmount] = useState("");
  const [treasuryInput, setTreasuryInput] = useState("");
  const [subscriptionIdInput, setSubscriptionIdInput] = useState("");
  const [vrfConfigForm, setVrfConfigForm] = useState({
    callbackGasLimit: "",
    requestConfirmations: "",
    numWords: "",
    keyHash: "",
  });
  const [retryRequestId, setRetryRequestId] = useState("");
  const [cancelRequestId, setCancelRequestId] = useState("");
  const [withdrawGnarsAmount, setWithdrawGnarsAmount] = useState("");
  const [withdrawGnarsTo, setWithdrawGnarsTo] = useState("");
  const [withdrawTokenAddress, setWithdrawTokenAddress] = useState("");
  const [withdrawTokenAmount, setWithdrawTokenAmount] = useState("");
  const [withdrawTokenTo, setWithdrawTokenTo] = useState("");
  const [withdrawNftAddress, setWithdrawNftAddress] = useState("");
  const [withdrawNftTokenId, setWithdrawNftTokenId] = useState("");
  const [withdrawNftTo, setWithdrawNftTo] = useState("");
  const [withdrawEthAmount, setWithdrawEthAmount] = useState("");
  const [withdrawEthTo, setWithdrawEthTo] = useState("");
  const seenFlexEvents = useRef<Set<string>>(new Set());
  const [flexConfigForm, setFlexConfigForm] = useState({
    minFlexEth: "",
    flexNothingBps: "",
    flexNftBpsMin: "",
    flexNftBpsMax: "",
    flexNftBpsPerEth: "",
    flexGnarsBase: "",
    flexGnarsPerEth: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("gnarsLootboxAddress");
    if (stored && isAddress(stored)) {
      setLootboxAddress(stored as Address);
      setLootboxAddressInput(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("gnarsLootboxAddress", lootboxAddress);
  }, [lootboxAddress]);

  useEffect(() => {
    seenFlexEvents.current.clear();
  }, [lootboxAddress]);

  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTransactionError } = useWaitForTransactionReceipt({
    hash: pendingHash,
    chainId: CHAIN.id,
  });

  const flexValue = useMemo(() => {
    try {
      return parseEther(flexEth || "0");
    } catch {
      return 0n;
    }
  }, [flexEth]);

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
      staleTime: 30_000, // Cache for 30 seconds
      gcTime: 60_000, // Keep in cache for 1 minute
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
      // Clear states immediately on error
      setPendingHash(undefined);
      setPendingLabel(null);
    }
  }, [isTransactionError, pendingHash]);

  // Refetch balances when transaction confirms and cleanup states
  useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        refetch();
      }, 2000);

      // Clear pending states after animation completes (4 seconds total for full animation)
      const cleanupTimer = setTimeout(() => {
        setPendingHash(undefined);
        setPendingLabel(null);
      }, 4000);

      return () => clearTimeout(cleanupTimer);
    }
  }, [isConfirmed, refetch]);

  // V4: Separate hook for getFlexPreview so it updates reactively when flexValue changes
  const { data: flexPreviewData } = useReadContract({
    address: lootboxAddress,
    abi: gnarsLootboxV4Abi,
    functionName: "getFlexPreview",
    args: [flexValue > 0n ? flexValue : parseEther("0.0002")],
    query: {
      enabled: true,
    },
  });

  // Read GNARS token balance of the lootbox contract
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

  const { data: lootboxEthBalance } = useBalance({
    address: lootboxAddress,
    chainId: base.id,
  });

  const { data: allowlistStatus } = useAllowedNft(lootboxAddress, allowlistNft);
  const { data: depositNftStatus } = useAllowedNft(lootboxAddress, nftContract);
  const { data: withdrawNftStatus } = useAllowedNft(lootboxAddress, withdrawNftAddress);

  const withdrawTokenIsValid = isAddress(withdrawTokenAddress);
  const { data: withdrawTokenBalance } = useReadContract({
    address: withdrawTokenIsValid ? (withdrawTokenAddress as Address) : ZERO_ADDRESS,
    abi: erc20BalanceAbi,
    functionName: "balanceOf",
    args: [lootboxAddress],
    query: { enabled: withdrawTokenIsValid },
  });

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
    gnarsUnit,
    , // Skip gnarsToken - handled separately via gnarsTokenAddress
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
  const depositNftPresetValue = useMemo(
    () => matchPreset(nftContract, NFT_PRESETS) ?? CUSTOM_PRESET,
    [nftContract],
  );
  const allowlistPresetValue = useMemo(
    () => matchPreset(allowlistNft, NFT_PRESETS) ?? CUSTOM_PRESET,
    [allowlistNft],
  );
  const withdrawNftPresetValue = useMemo(
    () => matchPreset(withdrawNftAddress, NFT_PRESETS) ?? CUSTOM_PRESET,
    [withdrawNftAddress],
  );
  const withdrawTokenPresetValue = useMemo(
    () => matchPreset(withdrawTokenAddress, TOKEN_PRESETS) ?? CUSTOM_PRESET,
    [withdrawTokenAddress],
  );

  const handleUseLootboxAddress = useCallback(() => {
    const normalizedInput = lootboxAddressInput.trim();
    if (!normalizedInput) {
      toast.error("Enter a lootbox address.");
      return;
    }
    if (!isAddress(normalizedInput)) {
      toast.error("Lootbox address is invalid.");
      return;
    }
    setLootboxAddress(normalizedInput as Address);
    setLootboxAddressInput(normalizedInput);
    toast.success("Lootbox address updated.");
  }, [lootboxAddressInput]);

  const handleResetLootboxAddress = useCallback(() => {
    setLootboxAddress(DEFAULT_LOOTBOX_ADDRESS);
    setLootboxAddressInput(DEFAULT_LOOTBOX_ADDRESS);
    toast.info("Lootbox address reset to default.");
  }, []);

  const ensureBase = useCallback(async () => {
    if (chain?.id === base.id) return true;
    try {
      toast.info("Switching to Base...");
      await switchChainAsync({ chainId: base.id });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to switch network";
      toast.error("Network switch failed", { description: message });
      return false;
    }
  }, [chain?.id, switchChainAsync]);

  const handleOpenFlex = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to join Gnars DAO.");
      return;
    }
    let value: bigint;
    try {
      value = parseEther(flexEth || "0");
    } catch {
      toast.error("Invalid ETH amount.");
      return;
    }
    if (value === 0n) {
      toast.error("Enter an amount above zero.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      setPendingLabel("Joining Gnars");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "openFlexBox",
        value,
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Transaction submitted", {
        description: "Welcome to Gnars DAO! Getting your tokens...",
      });
    } catch (err) {
      if (isUserRejection(err)) {
        const gnarlyMsg = getGnarlyRejectionMessage();
        toast.error(gnarlyMsg.title, { description: gnarlyMsg.description });
      } else {
        const message = err instanceof Error ? err.message : "Transaction failed";
        toast.error("Transaction failed", { description: message });
      }
      setPendingLabel(null);
      setPendingHash(undefined);
    }
  }, [address, ensureBase, flexEth, isConnected, lootboxAddress, writeContractAsync]);

  const handleOpenFlexWithAmount = useCallback(async (ethAmount: string) => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to join Gnars DAO.");
      return;
    }
    let value: bigint;
    try {
      value = parseEther(ethAmount);
    } catch {
      toast.error("Invalid ETH amount.");
      return;
    }
    if (value === 0n) {
      toast.error("Enter an amount above zero.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      setPendingLabel("Joining Gnars");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "openFlexBox",
        value,
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Transaction submitted", {
        description: "Welcome to Gnars DAO! Getting your tokens...",
      });
    } catch (err) {
      if (isUserRejection(err)) {
        const gnarlyMsg = getGnarlyRejectionMessage();
        toast.error(gnarlyMsg.title, { description: gnarlyMsg.description });
      } else {
        const message = err instanceof Error ? err.message : "Transaction failed";
        toast.error("Transaction failed", { description: message });
      }
      setPendingLabel(null);
      setPendingHash(undefined);
    }
  }, [
    isConnected,
    address,
    ensureBase,
    writeContractAsync,
    lootboxAddress,
  ]);

  const handleDepositNFT = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to deposit NFTs.");
      return;
    }
    if (!nftContract || !nftTokenId) {
      toast.error("Enter NFT contract address and token ID.");
      return;
    }
    
    const normalizedNftContract = normalizeAddress(nftContract);
    if (!normalizedNftContract) {
      toast.error("NFT contract address is invalid.");
      return;
    }
    
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      // First approve the lootbox to transfer the NFT
      setPendingLabel("Approving NFT");
      const approveHash = await writeContractAsync({
        address: normalizedNftContract,
        abi: erc721Abi,
        functionName: "approve",
        args: [lootboxAddress, BigInt(nftTokenId)],
        chainId: base.id,
      });
      toast.info("Approval transaction submitted...");
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }
      
      // Then deposit
      setPendingLabel("Depositing NFT");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "depositFlexNft",
        args: [normalizedNftContract, BigInt(nftTokenId)],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("NFT deposited successfully!");
      setNftContract("");
      setNftTokenId("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Deposit failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, ensureBase, isConnected, lootboxAddress, nftContract, nftTokenId, publicClient, writeContractAsync]);

  const handleDepositGnars = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to deposit GNARS.");
      return;
    }
    if (!gnarsAmount || Number(gnarsAmount) <= 0) {
      toast.error("Enter a valid GNARS amount.");
      return;
    }
    
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      const amount = parseGnarsInput(gnarsAmount, gnarsUnit ?? undefined);
      if (walletGnarsBalance !== undefined && walletGnarsBalance < amount) {
        toast.error("Insufficient GNARS balance.");
        return;
      }
      const allowance = gnarsAllowance ?? 0n;
      
      if (allowance < amount) {
        setPendingLabel("Approving GNARS");
        const approveHash = await writeContractAsync({
          address: gnarsTokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [lootboxAddress, amount],
          chainId: base.id,
        });
        toast.info("Approval transaction submitted...");
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }
      
      // Then deposit
      setPendingLabel("Depositing GNARS");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "depositGnars",
        args: [amount],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("GNARS deposited successfully!");
      setGnarsAmount("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Deposit failed", { description: message });
      setPendingLabel(null);
    }
  }, [
    address,
    ensureBase,
    gnarsAllowance,
    gnarsAmount,
    gnarsUnit,
    isConnected,
    gnarsTokenAddress,
    lootboxAddress,
    publicClient,
    walletGnarsBalance,
    writeContractAsync,
  ]);

  const handleApproveGnars = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to approve GNARS.");
      return;
    }
    const amountInput = approveGnarsAmount || gnarsAmount;
    if (!amountInput) {
      toast.error("Enter a GNARS amount to approve.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      const amount = parseGnarsInput(amountInput, gnarsUnit ?? undefined);
      setPendingLabel("Approving GNARS");
      const hash = await writeContractAsync({
        address: gnarsTokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [lootboxAddress, amount],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Approve GNARS submitted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Approve GNARS failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, approveGnarsAmount, ensureBase, gnarsAmount, gnarsTokenAddress, gnarsUnit, isConnected, lootboxAddress, writeContractAsync]);

  const handleSetAllowlist = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to update the allowlist.");
      return;
    }
    if (!allowlistNft) {
      toast.error("Enter an NFT contract address.");
      return;
    }
    const normalized = normalizeAddress(allowlistNft);
    if (!normalized) {
      toast.error("NFT address is invalid.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      setPendingLabel(allowlistEnabled ? "Allowing NFT" : "Blocking NFT");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "setAllowedERC721",
        args: [normalized, allowlistEnabled],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Allowlist update submitted.");
      setAllowlistNft("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Allowlist update failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, allowlistEnabled, allowlistNft, ensureBase, isConnected, lootboxAddress, writeContractAsync]);

  const handleSetTreasury = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to update the treasury.");
      return;
    }
    if (!treasuryInput) {
      toast.error("Enter a treasury address.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      setPendingLabel("Updating Treasury");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "setTreasury",
        args: [treasuryInput as Address],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Treasury update submitted.");
      setTreasuryInput("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Treasury update failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, ensureBase, isConnected, lootboxAddress, treasuryInput, writeContractAsync]);

  const handleSetSubscriptionId = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to update the subscription.");
      return;
    }
    if (!subscriptionIdInput) {
      toast.error("Enter a subscription ID.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      const subId = BigInt(subscriptionIdInput);
      setPendingLabel("Updating Subscription");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "setSubscriptionId",
        args: [subId],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Subscription update submitted.");
      setSubscriptionIdInput("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Subscription update failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, ensureBase, isConnected, lootboxAddress, subscriptionIdInput, writeContractAsync]);

  const handleSetVrfConfig = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to update VRF config.");
      return;
    }
    const { callbackGasLimit, requestConfirmations, numWords, keyHash: keyHashInput } = vrfConfigForm;
    if (!callbackGasLimit || !requestConfirmations || !numWords || !keyHashInput) {
      toast.error("Fill in all VRF config fields.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      const gasLimitValue = Number.parseInt(callbackGasLimit, 10);
      const confirmationsValue = Number.parseInt(requestConfirmations, 10);
      const numWordsValue = Number.parseInt(numWords, 10);
      if (
        Number.isNaN(gasLimitValue) ||
        Number.isNaN(confirmationsValue) ||
        Number.isNaN(numWordsValue)
      ) {
        throw new Error("VRF numeric fields must be valid numbers.");
      }
      setPendingLabel("Updating VRF Config");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "setVrfConfig",
        args: [gasLimitValue, confirmationsValue, numWordsValue, keyHashInput as `0x${string}`],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("VRF config update submitted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("VRF config update failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, ensureBase, isConnected, lootboxAddress, vrfConfigForm, writeContractAsync]);

  const handleRetryOpen = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to retry requests.");
      return;
    }
    if (!retryRequestId) {
      toast.error("Enter a request ID.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      const requestId = BigInt(retryRequestId);
      setPendingLabel("Retrying Open");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "retryOpen",
        args: [requestId],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Retry submitted.");
      setRetryRequestId("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Retry failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, ensureBase, isConnected, lootboxAddress, retryRequestId, writeContractAsync]);

  const handleCancelOpen = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to cancel requests.");
      return;
    }
    if (!cancelRequestId) {
      toast.error("Enter a request ID.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      const requestId = BigInt(cancelRequestId);
      setPendingLabel("Cancelling Open");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "cancelOpen",
        args: [requestId],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Cancel submitted.");
      setCancelRequestId("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Cancel failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, cancelRequestId, ensureBase, isConnected, lootboxAddress, writeContractAsync]);

  const handleSetFlexConfig = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to update flex config.");
      return;
    }
    const {
      minFlexEth: minFlexEthInput,
      flexNothingBps: flexNothingBpsInput,
      flexNftBpsMin: flexNftBpsMinInput,
      flexNftBpsMax: flexNftBpsMaxInput,
      flexNftBpsPerEth: flexNftBpsPerEthInput,
      flexGnarsBase: flexGnarsBaseInput,
      flexGnarsPerEth: flexGnarsPerEthInput,
    } = flexConfigForm;
    if (
      !minFlexEthInput ||
      !flexNothingBpsInput ||
      !flexNftBpsMinInput ||
      !flexNftBpsMaxInput ||
      !flexNftBpsPerEthInput ||
      !flexGnarsBaseInput ||
      !flexGnarsPerEthInput
    ) {
      toast.error("Fill in all flex config fields.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      const minFlexEthValue = parseEther(minFlexEthInput);
      const flexNothingBpsValue = Number.parseInt(flexNothingBpsInput, 10);
      const flexNftBpsMinValue = Number.parseInt(flexNftBpsMinInput, 10);
      const flexNftBpsMaxValue = Number.parseInt(flexNftBpsMaxInput, 10);
      const flexNftBpsPerEthValue = Number.parseInt(flexNftBpsPerEthInput, 10);
      if (
        Number.isNaN(flexNothingBpsValue) ||
        Number.isNaN(flexNftBpsMinValue) ||
        Number.isNaN(flexNftBpsMaxValue) ||
        Number.isNaN(flexNftBpsPerEthValue)
      ) {
        throw new Error("Flex config numeric fields must be valid numbers.");
      }
      const flexGnarsBaseValue = parseGnarsInput(flexGnarsBaseInput, gnarsUnit ?? undefined);
      const flexGnarsPerEthValue = parseGnarsInput(flexGnarsPerEthInput, gnarsUnit ?? undefined);

      setPendingLabel("Updating Flex Config");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "setFlexConfig",
        args: [
          minFlexEthValue,
          flexNothingBpsValue,
          flexNftBpsMinValue,
          flexNftBpsMaxValue,
          flexNftBpsPerEthValue,
          flexGnarsBaseValue,
          flexGnarsPerEthValue,
        ],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Flex config update submitted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Flex config update failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, ensureBase, flexConfigForm, gnarsUnit, isConnected, lootboxAddress, writeContractAsync]);

  const handlePause = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to pause the contract.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;
    try {
      setPendingLabel("Pausing contract");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "pause",
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Pause submitted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Pause failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync]);

  const handleUnpause = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to unpause the contract.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;
    try {
      setPendingLabel("Unpausing contract");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "unpause",
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Unpause submitted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Unpause failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync]);

  const handleWithdrawGnars = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to withdraw GNARS.");
      return;
    }
    if (!withdrawGnarsAmount) {
      toast.error("Enter a GNARS amount.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      const amount = parseGnarsInput(withdrawGnarsAmount, gnarsUnit ?? undefined);
      const to = (withdrawGnarsTo || address) as Address;
      setPendingLabel("Withdrawing GNARS");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "withdrawGnars",
        args: [to, amount],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Withdraw GNARS submitted.");
      setWithdrawGnarsAmount("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Withdraw GNARS failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, ensureBase, gnarsUnit, isConnected, lootboxAddress, withdrawGnarsAmount, withdrawGnarsTo, writeContractAsync]);

  const handleWithdrawToken = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to withdraw tokens.");
      return;
    }
    const tokenAddress = withdrawTokenAddress.trim();
    if (!tokenAddress || !withdrawTokenAmount) {
      toast.error("Enter token address and amount.");
      return;
    }
    if (tokenAddress.toLowerCase() === gnarsTokenAddress.toLowerCase()) {
      toast.error("Use Withdraw GNARS for the GNARS token.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      const amount = BigInt(withdrawTokenAmount);
      const to = (withdrawTokenTo || address) as Address;
      setPendingLabel("Withdrawing token");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "withdrawERC20",
        args: [tokenAddress as Address, to, amount],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Withdraw token submitted.");
      setWithdrawTokenAddress("");
      setWithdrawTokenAmount("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Withdraw token failed", { description: message });
      setPendingLabel(null);
    }
  }, [
    address,
    ensureBase,
    gnarsTokenAddress,
    isConnected,
    lootboxAddress,
    withdrawTokenAddress,
    withdrawTokenAmount,
    withdrawTokenTo,
    writeContractAsync,
  ]);

  const handleWithdrawFlexNft = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to withdraw NFTs.");
      return;
    }
    if (!withdrawNftAddress || !withdrawNftTokenId) {
      toast.error("Enter NFT address and token ID.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      const tokenId = BigInt(withdrawNftTokenId);
      const to = (withdrawNftTo || address) as Address;
      setPendingLabel("Withdrawing flex NFT");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "withdrawFlexNft",
        args: [withdrawNftAddress as Address, tokenId, to],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Withdraw flex NFT submitted.");
      setWithdrawNftAddress("");
      setWithdrawNftTokenId("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Withdraw flex NFT failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, ensureBase, isConnected, lootboxAddress, withdrawNftAddress, withdrawNftTokenId, withdrawNftTo, writeContractAsync]);

  const handleWithdrawERC721 = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to withdraw NFTs.");
      return;
    }
    if (!withdrawNftAddress || !withdrawNftTokenId) {
      toast.error("Enter NFT address and token ID.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      const tokenId = BigInt(withdrawNftTokenId);
      const to = (withdrawNftTo || address) as Address;
      setPendingLabel("Withdrawing NFT");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "withdrawERC721",
        args: [withdrawNftAddress as Address, tokenId, to],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Withdraw NFT submitted.");
      setWithdrawNftAddress("");
      setWithdrawNftTokenId("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Withdraw NFT failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, ensureBase, isConnected, lootboxAddress, withdrawNftAddress, withdrawNftTokenId, withdrawNftTo, writeContractAsync]);

  const handleWithdrawEth = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet to withdraw ETH.");
      return;
    }
    if (!withdrawEthAmount) {
      toast.error("Enter an ETH amount.");
      return;
    }
    const onBase = await ensureBase();
    if (!onBase) return;

    try {
      const amount = parseEther(withdrawEthAmount);
      const to = (withdrawEthTo || address) as Address;
      setPendingLabel("Withdrawing ETH");
      const hash = await writeContractAsync({
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
        functionName: "withdrawETH",
        args: [to, amount],
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Withdraw ETH submitted.");
      setWithdrawEthAmount("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Withdraw ETH failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, ensureBase, isConnected, lootboxAddress, withdrawEthAmount, withdrawEthTo, writeContractAsync]);

  const flexStats = flexBalances as
    | readonly [bigint, bigint, bigint]
    | null;

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

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Gnars Lootbox</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Join Gnars DAO by getting GNARS governance tokens. Contribute ETH to receive GNARS tokens, with a chance to win bonus NFTs. The more you contribute, the more GNARS you receive and the better your odds of winning an NFT.
        </p>
      </div>

      <Tabs defaultValue="join" className="space-y-8">
        <TabsList className="grid w-full max-w-3xl grid-cols-3">
          <TabsTrigger value="join">Join DAO</TabsTrigger>
          <TabsTrigger value="3d">3D Experience</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <JoinDAOTab
          flexEth={flexEth}
          setFlexEth={setFlexEth}
          gnarsChance={gnarsChance}
          nftChance={nftChance}
          nothingChance={nothingChance}
          flexGnarsBase={flexGnarsBase}
          flexGnarsPerEth={flexGnarsPerEth}
          flexNftBpsMin={flexNftBpsMin}
          flexNftBpsMax={flexNftBpsMax}
          flexNftBpsPerEth={flexNftBpsPerEth}
          gnarsUnit={gnarsUnit}
          handleOpenFlex={handleOpenFlex}
          isConnected={isConnected}
          isPaused={isPaused}
          lootboxAddress={lootboxAddress}
          refetch={refetch}
          isFetching={isFetching}
          contractGnarsBalance={contractGnarsBalance}
          flexStats={flexStats}
          minFlexEth={minFlexEth}
          chain={chain}
          pendingLabel={pendingLabel}
          isConfirming={isConfirming}
          isConfirmed={isConfirmed}
          flexNftCountsReady={flexNftCountsReady}
          flexNftCounts={flexNftCounts}
        />

        <Experience3DTab
          flexGnarsBase={flexGnarsBase}
          flexGnarsPerEth={flexGnarsPerEth}
          flexNftBpsMin={flexNftBpsMin}
          flexNftBpsMax={flexNftBpsMax}
          flexNftBpsPerEth={flexNftBpsPerEth}
          gnarsUnit={gnarsUnit}
          onOpen={handleOpenFlexWithAmount}
          isConnected={isConnected}
          address={address}
          isPaused={isPaused}
          pendingLabel={pendingLabel}
          isConfirmed={isConfirmed}
        />

        <TabsContent value="admin" className="space-y-8">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Lootbox V4 Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lootbox-address">Active Contract Address</Label>
                <Input
                  id="lootbox-address"
                  value={lootboxAddressInput}
                  onChange={(e) => setLootboxAddressInput(e.target.value)}
                  placeholder={DEFAULT_LOOTBOX_ADDRESS}
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Button variant="outline" onClick={handleUseLootboxAddress}>
                  Use Address
                </Button>
                <Button variant="outline" onClick={handleResetLootboxAddress}>
                  Reset to Default
                </Button>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Current</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <ReadItem label="Active contract" value={<AddressRenderer value={lootboxAddress} />} />
                  <ReadItem label="Owner" value={<AddressRenderer value={owner?.toString()} />} />
                  <ReadItem label="Treasury" value={<AddressRenderer value={treasury?.toString()} />} />
                  <ReadItem label="GNARS token" value={<AddressRenderer value={gnarsTokenAddress} />} />
                  <ReadItem label="GNARS unit" value={formatOptional(gnarsUnit)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Flex Config (Owner Only)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="flex-min-eth">Min Flex ETH</Label>
                  <Input
                    id="flex-min-eth"
                    value={flexConfigForm.minFlexEth}
                    onChange={(e) => setFlexConfigForm((prev) => ({ ...prev, minFlexEth: e.target.value }))}
                    placeholder={minFlexEth ? formatEther(minFlexEth) : "0.0002"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flex-nothing-bps">Flex Nothing Bps</Label>
                  <Input
                    id="flex-nothing-bps"
                    value={flexConfigForm.flexNothingBps}
                    onChange={(e) => setFlexConfigForm((prev) => ({ ...prev, flexNothingBps: e.target.value }))}
                    placeholder={flexNothingBps ? flexNothingBps.toString() : "0"}
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flex-nft-bps-min">Flex NFT Bps Min</Label>
                  <Input
                    id="flex-nft-bps-min"
                    value={flexConfigForm.flexNftBpsMin}
                    onChange={(e) => setFlexConfigForm((prev) => ({ ...prev, flexNftBpsMin: e.target.value }))}
                    placeholder={flexNftBpsMin ? flexNftBpsMin.toString() : "0"}
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flex-nft-bps-max">Flex NFT Bps Max</Label>
                  <Input
                    id="flex-nft-bps-max"
                    value={flexConfigForm.flexNftBpsMax}
                    onChange={(e) => setFlexConfigForm((prev) => ({ ...prev, flexNftBpsMax: e.target.value }))}
                    placeholder={flexNftBpsMax ? flexNftBpsMax.toString() : "0"}
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flex-nft-bps-per-eth">Flex NFT Bps Per ETH</Label>
                  <Input
                    id="flex-nft-bps-per-eth"
                    value={flexConfigForm.flexNftBpsPerEth}
                    onChange={(e) => setFlexConfigForm((prev) => ({ ...prev, flexNftBpsPerEth: e.target.value }))}
                    placeholder={flexNftBpsPerEth ? flexNftBpsPerEth.toString() : "0"}
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flex-gnars-base">Flex GNARS Base (tokens)</Label>
                  <Input
                    id="flex-gnars-base"
                    value={flexConfigForm.flexGnarsBase}
                    onChange={(e) => setFlexConfigForm((prev) => ({ ...prev, flexGnarsBase: e.target.value }))}
                    placeholder={flexGnarsBase ? formatGnarsAmount(flexGnarsBase, gnarsUnit) : "0"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flex-gnars-per-eth">Flex GNARS Per ETH (tokens)</Label>
                  <Input
                    id="flex-gnars-per-eth"
                    value={flexConfigForm.flexGnarsPerEth}
                    onChange={(e) => setFlexConfigForm((prev) => ({ ...prev, flexGnarsPerEth: e.target.value }))}
                    placeholder={flexGnarsPerEth ? formatGnarsAmount(flexGnarsPerEth, gnarsUnit) : "0"}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleSetFlexConfig} disabled={!canAdmin}>
                {canAdmin ? "Update Flex Config" : "Owner Only"}
              </Button>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Current</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <ReadItem
                    label="Min Flex ETH"
                    value={minFlexEth !== null ? `${formatEther(minFlexEth)} ETH` : "-"}
                  />
                  <ReadItem label="Flex Nothing Bps" value={formatOptional(flexNothingBps)} />
                  <ReadItem label="Flex NFT Bps Min" value={formatOptional(flexNftBpsMin)} />
                  <ReadItem label="Flex NFT Bps Max" value={formatOptional(flexNftBpsMax)} />
                  <ReadItem label="Flex NFT Bps Per ETH" value={formatOptional(flexNftBpsPerEth)} />
                  <ReadItem
                    label="Flex GNARS Base"
                    value={flexGnarsBase !== null ? formatGnarsAmount(flexGnarsBase, gnarsUnit) : "-"}
                  />
                  <ReadItem
                    label="Flex GNARS Per ETH"
                    value={flexGnarsPerEth !== null ? formatGnarsAmount(flexGnarsPerEth, gnarsUnit) : "-"}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">ERC721 Allowlist (Owner Only)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Preset NFT</Label>
                <Select
                  value={allowlistPresetValue}
                  onValueChange={(value) => setAllowlistNft(value === CUSTOM_PRESET ? "" : String(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CUSTOM_PRESET}>Custom</SelectItem>
                    {NFT_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {formatPresetLabel(preset.label, preset.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowlist-nft">NFT Contract Address</Label>
                <Input
                  id="allowlist-nft"
                  value={allowlistNft}
                  onChange={(e) => setAllowlistNft(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Allow in Lootbox</p>
                  <p className="text-xs text-muted-foreground">Toggle to allow or block deposits.</p>
                </div>
                <Switch checked={allowlistEnabled} onCheckedChange={setAllowlistEnabled} />
              </div>
              <Button className="w-full" onClick={handleSetAllowlist} disabled={!canAdmin}>
                {canAdmin ? "Update Allowlist" : "Owner Only"}
              </Button>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Current</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <ReadItem label="Selected NFT" value={<AddressRenderer value={allowlistNft || null} />} />
                  <ReadItem
                    label="Allowlisted"
                    value={formatAllowlistStatus(allowlistNft, allowlistStatus as boolean | undefined)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Contract Controls (Owner Only)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Button variant="outline" onClick={handlePause} disabled={!canAdmin}>
                  {canAdmin ? "Pause Contract" : "Owner Only"}
                </Button>
                <Button variant="outline" onClick={handleUnpause} disabled={!canAdmin}>
                  {canAdmin ? "Unpause Contract" : "Owner Only"}
                </Button>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Current</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <ReadItem
                    label="Paused"
                    value={isPaused === null ? "-" : isPaused ? "Paused" : "Active"}
                  />
                  <ReadItem label="Owner" value={<AddressRenderer value={owner?.toString()} />} />
                  <ReadItem label="You are owner" value={isOwner ? "Yes" : "No"} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">VRF + Treasury (Owner Only)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="treasury-input">Treasury Address</Label>
                <Input
                  id="treasury-input"
                  value={treasuryInput}
                  onChange={(e) => setTreasuryInput(e.target.value)}
                  placeholder={treasury?.toString() || "0x..."}
                />
              </div>
              <Button className="w-full" onClick={handleSetTreasury} disabled={!canAdmin}>
                {canAdmin ? "Update Treasury" : "Owner Only"}
              </Button>
              <div className="space-y-2">
                <Label htmlFor="subscription-id">Subscription ID</Label>
                <Input
                  id="subscription-id"
                  value={subscriptionIdInput}
                  onChange={(e) => setSubscriptionIdInput(e.target.value)}
                  placeholder={subscriptionId?.toString() || "0"}
                />
              </div>
              <Button className="w-full" onClick={handleSetSubscriptionId} disabled={!canAdmin}>
                {canAdmin ? "Update Subscription" : "Owner Only"}
              </Button>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vrf-callback-gas">Callback Gas Limit</Label>
                  <Input
                    id="vrf-callback-gas"
                    value={vrfConfigForm.callbackGasLimit}
                    onChange={(e) => setVrfConfigForm((prev) => ({ ...prev, callbackGasLimit: e.target.value }))}
                    placeholder={callbackGasLimit?.toString() || "400000"}
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vrf-confirmations">Request Confirmations</Label>
                  <Input
                    id="vrf-confirmations"
                    value={vrfConfigForm.requestConfirmations}
                    onChange={(e) => setVrfConfigForm((prev) => ({ ...prev, requestConfirmations: e.target.value }))}
                    placeholder={requestConfirmations?.toString() || "3"}
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vrf-num-words">Num Words</Label>
                  <Input
                    id="vrf-num-words"
                    value={vrfConfigForm.numWords}
                    onChange={(e) => setVrfConfigForm((prev) => ({ ...prev, numWords: e.target.value }))}
                    placeholder={numWords?.toString() || "1"}
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vrf-keyhash">Key Hash</Label>
                  <Input
                    id="vrf-keyhash"
                    value={vrfConfigForm.keyHash}
                    onChange={(e) => setVrfConfigForm((prev) => ({ ...prev, keyHash: e.target.value }))}
                    placeholder={keyHash?.toString() || "0x..."}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleSetVrfConfig} disabled={!canAdmin}>
                {canAdmin ? "Update VRF Config" : "Owner Only"}
              </Button>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Current</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <ReadItem label="Treasury" value={<AddressRenderer value={treasury?.toString()} />} />
                  <ReadItem label="Subscription ID" value={formatOptional(subscriptionId)} />
                  <ReadItem label="Callback Gas Limit" value={formatOptional(callbackGasLimit)} />
                  <ReadItem label="Request Confirmations" value={formatOptional(requestConfirmations)} />
                  <ReadItem label="Num Words" value={formatOptional(numWords)} />
                  <ReadItem
                    label="Key Hash"
                    value={
                      keyHash ? (
                        <span className="font-mono text-xs break-all">{keyHash.toString()}</span>
                      ) : (
                        "-"
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Request Recovery (Owner Only)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="retry-request-id">Retry Request ID</Label>
                  <Input
                    id="retry-request-id"
                    value={retryRequestId}
                    onChange={(e) => setRetryRequestId(e.target.value)}
                    placeholder="1234"
                  />
                  <Button variant="outline" onClick={handleRetryOpen} disabled={!canAdmin}>
                    {canAdmin ? "Retry Open" : "Owner Only"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancel-request-id">Cancel Request ID</Label>
                  <Input
                    id="cancel-request-id"
                    value={cancelRequestId}
                    onChange={(e) => setCancelRequestId(e.target.value)}
                    placeholder="1234"
                  />
                  <Button variant="outline" onClick={handleCancelOpen} disabled={!canAdmin}>
                    {canAdmin ? "Cancel Open" : "Owner Only"}
                  </Button>
                </div>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Current</p>
                <div className="mt-2">
                  {activeRequestId === null && (
                    <p className="text-xs text-muted-foreground">
                      Enter a request ID to view the current pending state.
                    </p>
                  )}
                  {activeRequestId !== null && (!pendingOpen || pendingOpen.user === ZERO_ADDRESS) && (
                    <p className="text-xs text-muted-foreground">
                      No pending open found for this request ID.
                    </p>
                  )}
                  {activeRequestId !== null && pendingOpen && pendingOpen.user !== ZERO_ADDRESS && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ReadItem label="Request ID" value={activeRequestId.toString()} />
                      <ReadItem label="User" value={<AddressRenderer value={pendingOpen.user} />} />
                      <ReadItem label="Paid" value={`${formatEther(pendingOpen.paid)} ETH`} />
                      <ReadItem
                        label="GNARS Payout"
                        value={formatGnarsAmount(pendingOpen.flexGnarsPayout, gnarsUnit)}
                      />
                      <ReadItem label="Nothing Bps" value={formatOptional(pendingOpen.flexNothingBps)} />
                      <ReadItem label="NFT Bps" value={formatOptional(pendingOpen.flexNftBps)} />
                      <ReadItem label="Fulfilled" value={pendingOpen.fulfilled ? "Yes" : "No"} />
                      <ReadItem label="NFT Reserved" value={pendingOpen.flexNftReserved ? "Yes" : "No"} />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" /> Deposit NFT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Preset NFT</Label>
                <Select
                  value={depositNftPresetValue}
                  onValueChange={(value) => setNftContract(value === CUSTOM_PRESET ? "" : String(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CUSTOM_PRESET}>Custom</SelectItem>
                    {NFT_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {formatPresetLabel(preset.label, preset.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nft-contract">NFT Contract Address</Label>
                <Input
                  id="nft-contract"
                  value={nftContract}
                  onChange={(e) => setNftContract(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nft-token-id">Token ID</Label>
                <Input
                  id="nft-token-id"
                  value={nftTokenId}
                  onChange={(e) => setNftTokenId(e.target.value)}
                  placeholder="1"
                  type="number"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleDepositNFT} 
                disabled={!canAdmin}
              >
                {canAdmin ? "Deposit NFT" : "Owner Only"}
              </Button>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Current</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <ReadItem label="Selected NFT" value={<AddressRenderer value={nftContract || null} />} />
                  <ReadItem
                    label="Allowlisted"
                    value={formatAllowlistStatus(nftContract, depositNftStatus as boolean | undefined)}
                  />
                  <ReadItem label="Flex NFTs Available" value={flexStats ? flexStats[0].toString() : "-"} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Coins className="h-5 w-5" /> GNARS ERC20 Wallet (Owner Only)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Balances</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ReadItem label="GNARS token" value={<AddressRenderer value={gnarsTokenAddress} />} />
                  <ReadItem
                    label="Contract GNARS"
                    value={contractGnarsBalance !== undefined ? formatGnarsAmount(contractGnarsBalance, gnarsUnit) : "-"}
                  />
                  <ReadItem
                    label="Available GNARS"
                    value={flexStats ? formatGnarsAmount(flexStats[1], gnarsUnit) : "-"}
                  />
                  <ReadItem
                    label="Reserved GNARS"
                    value={flexStats ? formatGnarsAmount(flexStats[2], gnarsUnit) : "-"}
                  />
                  <ReadItem
                    label="Wallet GNARS"
                    value={walletGnarsBalance !== undefined ? formatGnarsAmount(walletGnarsBalance, gnarsUnit) : "-"}
                  />
                  <ReadItem
                    label="Allowance"
                    value={gnarsAllowance !== undefined ? formatGnarsAmount(gnarsAllowance, gnarsUnit) : "-"}
                  />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4 rounded-md border border-border/60 bg-muted/30 px-4 py-3">
                  <p className="text-sm font-medium">Deposit</p>
                  <div className="space-y-2">
                    <Label htmlFor="gnars-amount">GNARS Amount</Label>
                    <Input
                      id="gnars-amount"
                      value={gnarsAmount}
                      onChange={(e) => setGnarsAmount(e.target.value)}
                      placeholder="1000"
                      type="number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gnars-approve-amount">Approve GNARS Amount (optional)</Label>
                    <Input
                      id="gnars-approve-amount"
                      value={approveGnarsAmount}
                      onChange={(e) => setApproveGnarsAmount(e.target.value)}
                      placeholder={gnarsAmount || "1000"}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="outline" onClick={handleApproveGnars} disabled={!canAdmin}>
                      {canAdmin ? "Approve" : "Owner Only"}
                    </Button>
                    <Button className="w-full" onClick={handleDepositGnars} disabled={!canAdmin}>
                      {canAdmin ? "Deposit" : "Owner Only"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 rounded-md border border-border/60 bg-muted/30 px-4 py-3">
                  <p className="text-sm font-medium">Withdraw</p>
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-gnars-amount">GNARS Amount</Label>
                    <Input
                      id="withdraw-gnars-amount"
                      value={withdrawGnarsAmount}
                      onChange={(e) => setWithdrawGnarsAmount(e.target.value)}
                      placeholder="1000"
                    />
                    <p className="text-xs text-muted-foreground">
                      Available: {flexStats ? formatGnarsAmount(flexStats[1], gnarsUnit) : "-"} GNARS
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-gnars-to">Recipient (optional)</Label>
                    <Input
                      id="withdraw-gnars-to"
                      value={withdrawGnarsTo}
                      onChange={(e) => setWithdrawGnarsTo(e.target.value)}
                      placeholder={address || "0x..."}
                    />
                  </div>
                  <Button className="w-full" onClick={handleWithdrawGnars} disabled={!canAdmin}>
                    {canAdmin ? "Withdraw" : "Owner Only"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Withdraw ERC20 (Rescue)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Token Preset</Label>
                <Select
                  value={withdrawTokenPresetValue}
                  onValueChange={(value) => setWithdrawTokenAddress(value === CUSTOM_PRESET ? "" : String(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CUSTOM_PRESET}>Custom</SelectItem>
                    {TOKEN_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {formatPresetLabel(preset.label, preset.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  GNARS uses Withdraw GNARS instead of ERC20 rescue.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdraw-token-address">Token Address</Label>
                <Input
                  id="withdraw-token-address"
                  value={withdrawTokenAddress}
                  onChange={(e) => setWithdrawTokenAddress(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdraw-token-amount">Amount (raw units)</Label>
                <Input
                  id="withdraw-token-amount"
                  value={withdrawTokenAmount}
                  onChange={(e) => setWithdrawTokenAmount(e.target.value)}
                  placeholder="1000000000000000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdraw-token-to">Recipient (optional)</Label>
                <Input
                  id="withdraw-token-to"
                  value={withdrawTokenTo}
                  onChange={(e) => setWithdrawTokenTo(e.target.value)}
                  placeholder={address || "0x..."}
                />
              </div>
              <Button className="w-full" onClick={handleWithdrawToken} disabled={!canAdmin}>
                {canAdmin ? "Withdraw Token" : "Owner Only"}
              </Button>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Current</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <ReadItem label="Token address" value={<AddressRenderer value={withdrawTokenAddress || null} />} />
                  <ReadItem
                    label="Contract balance (raw)"
                    value={withdrawTokenBalance !== undefined ? withdrawTokenBalance.toString() : "-"}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Withdraw NFT (Owner Only)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Preset NFT</Label>
                <Select
                  value={withdrawNftPresetValue}
                  onValueChange={(value) => setWithdrawNftAddress(value === CUSTOM_PRESET ? "" : String(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CUSTOM_PRESET}>Custom</SelectItem>
                    {NFT_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {formatPresetLabel(preset.label, preset.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdraw-nft-address">NFT Address</Label>
                <Input
                  id="withdraw-nft-address"
                  value={withdrawNftAddress}
                  onChange={(e) => setWithdrawNftAddress(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdraw-nft-tokenid">Token ID</Label>
                <Input
                  id="withdraw-nft-tokenid"
                  value={withdrawNftTokenId}
                  onChange={(e) => setWithdrawNftTokenId(e.target.value)}
                  placeholder="1"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdraw-nft-to">Recipient (optional)</Label>
                <Input
                  id="withdraw-nft-to"
                  value={withdrawNftTo}
                  onChange={(e) => setWithdrawNftTo(e.target.value)}
                  placeholder={address || "0x..."}
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Button variant="outline" onClick={handleWithdrawFlexNft} disabled={!canAdmin}>
                  {canAdmin ? "Withdraw Flex NFT" : "Owner Only"}
                </Button>
                <Button variant="outline" onClick={handleWithdrawERC721} disabled={!canAdmin}>
                  {canAdmin ? "Rescue ERC721" : "Owner Only"}
                </Button>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Current</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <ReadItem label="NFT address" value={<AddressRenderer value={withdrawNftAddress || null} />} />
                  <ReadItem
                    label="Allowlisted"
                    value={formatAllowlistStatus(withdrawNftAddress, withdrawNftStatus as boolean | undefined)}
                  />
                  <ReadItem label="Flex NFTs Available" value={flexStats ? flexStats[0].toString() : "-"} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Withdraw ETH (Owner Only)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdraw-eth-amount">ETH Amount</Label>
                <Input
                  id="withdraw-eth-amount"
                  value={withdrawEthAmount}
                  onChange={(e) => setWithdrawEthAmount(e.target.value)}
                  placeholder="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdraw-eth-to">Recipient (optional)</Label>
                <Input
                  id="withdraw-eth-to"
                  value={withdrawEthTo}
                  onChange={(e) => setWithdrawEthTo(e.target.value)}
                  placeholder={address || "0x..."}
                />
              </div>
              <Button className="w-full" onClick={handleWithdrawEth} disabled={!canAdmin}>
                {canAdmin ? "Withdraw ETH" : "Owner Only"}
              </Button>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Current</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <ReadItem
                    label="Contract ETH balance"
                    value={lootboxEthBalance ? `${formatEther(lootboxEthBalance.value)} ETH` : "-"}
                  />
                  <ReadItem label="Treasury" value={<AddressRenderer value={treasury?.toString()} />} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Contract Balances</CardTitle>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? "Refreshing..." : "Refresh"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎁</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Flex NFTs Available</p>
                      <p className="text-2xl font-bold">
                        {isFetching ? "..." : flexStats ? flexStats[0].toString() : "0"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    <div>
                      <p className="text-xs text-muted-foreground">GNARS ERC20 Available</p>
                      <p className="text-2xl font-bold">
                        {isFetching ? "..." : flexStats ? formatGnarsAmount(flexStats[1], gnarsUnit) : "0"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔒</span>
                    <div>
                      <p className="text-xs text-muted-foreground">GNARS Reserved</p>
                      <p className="text-2xl font-bold">
                        {isFetching ? "..." : flexStats ? formatGnarsAmount(flexStats[2], gnarsUnit) : "0"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧢</span>
                    <div>
                      <p className="text-xs text-muted-foreground">GNARS NFTs in Pool</p>
                      <p className="text-2xl font-bold">
                        {flexNftCountsReady ? flexNftCounts.gnars.toString() : "..."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧪</span>
                    <div>
                      <p className="text-xs text-muted-foreground">HackerDAO NFTs in Pool</p>
                      <p className="text-2xl font-bold">
                        {flexNftCountsReady ? flexNftCounts.hacker.toString() : "..."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
