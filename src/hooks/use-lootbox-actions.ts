"use client";

import { useCallback } from "react";
import { Address, parseEther } from "viem";
import { base } from "wagmi/chains";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { toast } from "sonner";
import gnarsLootboxV4Abi from "@/utils/abis/gnarsLootboxV4Abi";
import erc20Abi from "@/utils/abis/erc20Abi";
import erc721Abi from "@/utils/abis/erc721Abi";
import {
  normalizeAddress,
  parseGnarsInput,
  getGnarlyRejectionMessage,
  isUserRejection,
} from "@/lib/lootbox";

interface UseLootboxActionsOptions {
  lootboxAddress: Address;
  gnarsTokenAddress: Address;
  gnarsUnit: bigint | null;
  walletGnarsBalance: bigint | undefined;
  gnarsAllowance: bigint | undefined;
  setPendingHash: (hash: `0x${string}` | undefined) => void;
  setPendingLabel: (label: string | null) => void;
}

interface FormState {
  flexEth: string;
  nftContract: string;
  nftTokenId: string;
  gnarsAmount: string;
  allowlistNft: string;
  allowlistEnabled: boolean;
  approveGnarsAmount: string;
  treasuryInput: string;
  subscriptionIdInput: string;
  vrfConfigForm: {
    callbackGasLimit: string;
    requestConfirmations: string;
    numWords: string;
    keyHash: string;
  };
  retryRequestId: string;
  cancelRequestId: string;
  withdrawGnarsAmount: string;
  withdrawGnarsTo: string;
  withdrawTokenAddress: string;
  withdrawTokenAmount: string;
  withdrawTokenTo: string;
  withdrawNftAddress: string;
  withdrawNftTokenId: string;
  withdrawNftTo: string;
  withdrawEthAmount: string;
  withdrawEthTo: string;
  flexConfigForm: {
    minFlexEth: string;
    flexNothingBps: string;
    flexNftBpsMin: string;
    flexNftBpsMax: string;
    flexNftBpsPerEth: string;
    flexGnarsBase: string;
    flexGnarsPerEth: string;
  };
}

interface FormSetters {
  setNftContract: (value: string) => void;
  setNftTokenId: (value: string) => void;
  setGnarsAmount: (value: string) => void;
  setAllowlistNft: (value: string) => void;
  setTreasuryInput: (value: string) => void;
  setSubscriptionIdInput: (value: string) => void;
  setRetryRequestId: (value: string) => void;
  setCancelRequestId: (value: string) => void;
  setWithdrawGnarsAmount: (value: string) => void;
  setWithdrawTokenAddress: (value: string) => void;
  setWithdrawTokenAmount: (value: string) => void;
  setWithdrawNftAddress: (value: string) => void;
  setWithdrawNftTokenId: (value: string) => void;
  setWithdrawEthAmount: (value: string) => void;
}

export function useLootboxActions({
  lootboxAddress,
  gnarsTokenAddress,
  gnarsUnit,
  walletGnarsBalance,
  gnarsAllowance,
  setPendingHash,
  setPendingLabel,
}: UseLootboxActionsOptions) {
  const { address, isConnected, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: base.id });

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

  const handleOpenFlex = useCallback(async (flexEth: string) => {
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
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

  const handleDepositNFT = useCallback(async (
    nftContract: string,
    nftTokenId: string,
    setNftContract: (v: string) => void,
    setNftTokenId: (v: string) => void
  ) => {
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
  }, [address, ensureBase, isConnected, lootboxAddress, publicClient, writeContractAsync, setPendingHash, setPendingLabel]);

  const handleDepositGnars = useCallback(async (
    gnarsAmount: string,
    setGnarsAmount: (v: string) => void
  ) => {
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
    gnarsUnit,
    isConnected,
    gnarsTokenAddress,
    lootboxAddress,
    publicClient,
    walletGnarsBalance,
    writeContractAsync,
    setPendingHash,
    setPendingLabel,
  ]);

  const handleApproveGnars = useCallback(async (
    approveGnarsAmount: string,
    gnarsAmount: string
  ) => {
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
  }, [address, ensureBase, gnarsTokenAddress, gnarsUnit, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

  const handleSetAllowlist = useCallback(async (
    allowlistNft: string,
    allowlistEnabled: boolean,
    setAllowlistNft: (v: string) => void
  ) => {
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
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

  const handleSetTreasury = useCallback(async (
    treasuryInput: string,
    setTreasuryInput: (v: string) => void
  ) => {
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
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

  const handleSetSubscriptionId = useCallback(async (
    subscriptionIdInput: string,
    setSubscriptionIdInput: (v: string) => void
  ) => {
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
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

  const handleSetVrfConfig = useCallback(async (vrfConfigForm: {
    callbackGasLimit: string;
    requestConfirmations: string;
    numWords: string;
    keyHash: string;
  }) => {
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
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

  const handleRetryOpen = useCallback(async (
    retryRequestId: string,
    setRetryRequestId: (v: string) => void
  ) => {
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
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

  const handleCancelOpen = useCallback(async (
    cancelRequestId: string,
    setCancelRequestId: (v: string) => void
  ) => {
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
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

  const handleSetFlexConfig = useCallback(async (flexConfigForm: {
    minFlexEth: string;
    flexNothingBps: string;
    flexNftBpsMin: string;
    flexNftBpsMax: string;
    flexNftBpsPerEth: string;
    flexGnarsBase: string;
    flexGnarsPerEth: string;
  }) => {
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
  }, [address, ensureBase, gnarsUnit, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

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
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

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
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

  const handleWithdrawGnars = useCallback(async (
    withdrawGnarsAmount: string,
    withdrawGnarsTo: string,
    setWithdrawGnarsAmount: (v: string) => void
  ) => {
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
  }, [address, ensureBase, gnarsUnit, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

  const handleWithdrawToken = useCallback(async (
    withdrawTokenAddress: string,
    withdrawTokenAmount: string,
    withdrawTokenTo: string,
    setWithdrawTokenAddress: (v: string) => void,
    setWithdrawTokenAmount: (v: string) => void
  ) => {
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
    writeContractAsync,
    setPendingHash,
    setPendingLabel,
  ]);

  const handleWithdrawFlexNft = useCallback(async (
    withdrawNftAddress: string,
    withdrawNftTokenId: string,
    withdrawNftTo: string,
    setWithdrawNftAddress: (v: string) => void,
    setWithdrawNftTokenId: (v: string) => void
  ) => {
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
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

  const handleWithdrawERC721 = useCallback(async (
    withdrawNftAddress: string,
    withdrawNftTokenId: string,
    withdrawNftTo: string,
    setWithdrawNftAddress: (v: string) => void,
    setWithdrawNftTokenId: (v: string) => void
  ) => {
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
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

  const handleWithdrawEth = useCallback(async (
    withdrawEthAmount: string,
    withdrawEthTo: string,
    setWithdrawEthAmount: (v: string) => void
  ) => {
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
  }, [address, ensureBase, isConnected, lootboxAddress, writeContractAsync, setPendingHash, setPendingLabel]);

  return {
    handleOpenFlex,
    handleDepositNFT,
    handleDepositGnars,
    handleApproveGnars,
    handleSetAllowlist,
    handleSetTreasury,
    handleSetSubscriptionId,
    handleSetVrfConfig,
    handleRetryOpen,
    handleCancelOpen,
    handleSetFlexConfig,
    handlePause,
    handleUnpause,
    handleWithdrawGnars,
    handleWithdrawToken,
    handleWithdrawFlexNft,
    handleWithdrawERC721,
    handleWithdrawEth,
  };
}
