"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { type Address, parseEther } from "viem";
import {
  getContract,
  prepareContractCall,
  type ThirdwebClient,
  waitForReceipt,
} from "thirdweb";
import { base } from "thirdweb/chains";
import { useActiveWallet, useSendTransaction } from "thirdweb/react";
import { useUserAddress } from "@/hooks/use-user-address";
import {
  getGnarlyRejectionMessage,
  isUserRejection,
  normalizeAddress,
  parseGnarsInput,
} from "@/lib/lootbox";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain } from "@/lib/thirdweb-tx";
import erc20Abi from "@/utils/abis/erc20Abi";
import erc721Abi from "@/utils/abis/erc721Abi";
import gnarsLootboxV4Abi from "@/utils/abis/gnarsLootboxV4Abi";

interface UseLootboxActionsOptions {
  lootboxAddress: Address;
  gnarsTokenAddress: Address;
  gnarsUnit: bigint | null;
  walletGnarsBalance: bigint | undefined;
  gnarsAllowance: bigint | undefined;
  setPendingHash: (hash: `0x${string}` | undefined) => void;
  setPendingLabel: (label: string | null) => void;
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
  const { address, isConnected } = useUserAddress();
  const wallet = useActiveWallet();
  const sendTx = useSendTransaction();

  /**
   * Shared plumbing for every lootbox write. The caller provides a label
   * shown while the tx is in flight and a prepareFn that builds the
   * PreparedTransaction against the current client. Returns the tx hash
   * on success, null on user rejection or any other failure (the helper
   * has already shown a toast and cleared the pending label).
   */
  const runWrite = useCallback(
    async (
      label: string,
      errorTitle: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prepareFn: (client: ThirdwebClient) => any,
    ): Promise<`0x${string}` | null> => {
      if (!isConnected || !address) {
        toast.error("Connect your wallet to continue.");
        return null;
      }
      const client = getThirdwebClient();
      if (!client) {
        toast.error(errorTitle, {
          description: "Thirdweb client not configured.",
        });
        return null;
      }

      setPendingLabel(label);
      try {
        await ensureOnChain(wallet, base);
        const tx = prepareFn(client);
        const result = await sendTx.mutateAsync(tx);
        setPendingHash(result.transactionHash as `0x${string}`);
        return result.transactionHash as `0x${string}`;
      } catch (err) {
        if (isUserRejection(err)) {
          const gnarlyMsg = getGnarlyRejectionMessage();
          toast.error(gnarlyMsg.title, { description: gnarlyMsg.description });
        } else {
          const message = err instanceof Error ? err.message : "Transaction failed";
          toast.error(errorTitle, { description: message });
        }
        setPendingLabel(null);
        setPendingHash(undefined);
        return null;
      }
    },
    [address, isConnected, wallet, sendTx, setPendingHash, setPendingLabel],
  );

  const handleOpenFlex = useCallback(
    async (flexEth: string) => {
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

      const hash = await runWrite("Joining Gnars", "Transaction failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: lootboxAddress,
          abi: gnarsLootboxV4Abi,
        });
        return prepareContractCall({
          contract,
          method: "openFlexBox",
          params: [],
          value,
        });
      });

      if (hash) {
        toast.success("Transaction submitted", {
          description: "Welcome to Gnars DAO! Getting your tokens...",
        });
      }
    },
    [lootboxAddress, runWrite],
  );

  const handleDepositNFT = useCallback(
    async (
      nftContract: string,
      nftTokenId: string,
      setNftContract: (v: string) => void,
      setNftTokenId: (v: string) => void,
    ) => {
      if (!nftContract || !nftTokenId) {
        toast.error("Enter NFT contract address and token ID.");
        return;
      }

      const normalizedNftContract = normalizeAddress(nftContract);
      if (!normalizedNftContract) {
        toast.error("NFT contract address is invalid.");
        return;
      }

      const approveHash = await runWrite("Approving NFT", "Approval failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: normalizedNftContract,
          abi: erc721Abi,
        });
        return prepareContractCall({
          contract,
          method: "approve",
          params: [lootboxAddress, BigInt(nftTokenId)],
        });
      });
      if (!approveHash) return;

      toast.info("Approval transaction submitted...");
      const client = getThirdwebClient();
      if (client) {
        await waitForReceipt({ client, chain: base, transactionHash: approveHash });
      }

      const depositHash = await runWrite("Depositing NFT", "Deposit failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: lootboxAddress,
          abi: gnarsLootboxV4Abi,
        });
        return prepareContractCall({
          contract,
          method: "depositFlexNft",
          params: [normalizedNftContract, BigInt(nftTokenId)],
        });
      });

      if (depositHash) {
        toast.success("NFT deposited successfully!");
        setNftContract("");
        setNftTokenId("");
      }
    },
    [lootboxAddress, runWrite],
  );

  const handleDepositGnars = useCallback(
    async (gnarsAmount: string, setGnarsAmount: (v: string) => void) => {
      if (!gnarsAmount || Number(gnarsAmount) <= 0) {
        toast.error("Enter a valid GNARS amount.");
        return;
      }

      const amount = parseGnarsInput(gnarsAmount, gnarsUnit ?? undefined);
      if (walletGnarsBalance !== undefined && walletGnarsBalance < amount) {
        toast.error("Insufficient GNARS balance.");
        return;
      }
      const allowance = gnarsAllowance ?? 0n;

      if (allowance < amount) {
        const approveHash = await runWrite(
          "Approving GNARS",
          "Approval failed",
          (client) => {
            const contract = getContract({
              client,
              chain: base,
              address: gnarsTokenAddress,
              abi: erc20Abi,
            });
            return prepareContractCall({
              contract,
              method: "approve",
              params: [lootboxAddress, amount],
            });
          },
        );
        if (!approveHash) return;
        toast.info("Approval transaction submitted...");
        const client = getThirdwebClient();
        if (client) {
          await waitForReceipt({ client, chain: base, transactionHash: approveHash });
        }
      }

      const depositHash = await runWrite("Depositing GNARS", "Deposit failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: lootboxAddress,
          abi: gnarsLootboxV4Abi,
        });
        return prepareContractCall({
          contract,
          method: "depositGnars",
          params: [amount],
        });
      });

      if (depositHash) {
        toast.success("GNARS deposited successfully!");
        setGnarsAmount("");
      }
    },
    [gnarsAllowance, gnarsTokenAddress, gnarsUnit, lootboxAddress, runWrite, walletGnarsBalance],
  );

  const handleApproveGnars = useCallback(
    async (approveGnarsAmount: string, gnarsAmount: string) => {
      const amountInput = approveGnarsAmount || gnarsAmount;
      if (!amountInput) {
        toast.error("Enter a GNARS amount to approve.");
        return;
      }
      const amount = parseGnarsInput(amountInput, gnarsUnit ?? undefined);

      const hash = await runWrite("Approving GNARS", "Approve GNARS failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: gnarsTokenAddress,
          abi: erc20Abi,
        });
        return prepareContractCall({
          contract,
          method: "approve",
          params: [lootboxAddress, amount],
        });
      });

      if (hash) {
        toast.success("Approve GNARS submitted.");
      }
    },
    [gnarsTokenAddress, gnarsUnit, lootboxAddress, runWrite],
  );

  const handleSetAllowlist = useCallback(
    async (
      allowlistNft: string,
      allowlistEnabled: boolean,
      setAllowlistNft: (v: string) => void,
    ) => {
      if (!allowlistNft) {
        toast.error("Enter an NFT contract address.");
        return;
      }
      const normalized = normalizeAddress(allowlistNft);
      if (!normalized) {
        toast.error("NFT address is invalid.");
        return;
      }

      const label = allowlistEnabled ? "Allowing NFT" : "Blocking NFT";
      const hash = await runWrite(label, "Allowlist update failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: lootboxAddress,
          abi: gnarsLootboxV4Abi,
        });
        return prepareContractCall({
          contract,
          method: "setAllowedERC721",
          params: [normalized, allowlistEnabled],
        });
      });

      if (hash) {
        toast.success("Allowlist update submitted.");
        setAllowlistNft("");
      }
    },
    [lootboxAddress, runWrite],
  );

  const handleSetTreasury = useCallback(
    async (treasuryInput: string, setTreasuryInput: (v: string) => void) => {
      if (!treasuryInput) {
        toast.error("Enter a treasury address.");
        return;
      }

      const hash = await runWrite("Updating Treasury", "Treasury update failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: lootboxAddress,
          abi: gnarsLootboxV4Abi,
        });
        return prepareContractCall({
          contract,
          method: "setTreasury",
          params: [treasuryInput as Address],
        });
      });

      if (hash) {
        toast.success("Treasury update submitted.");
        setTreasuryInput("");
      }
    },
    [lootboxAddress, runWrite],
  );

  const handleSetSubscriptionId = useCallback(
    async (subscriptionIdInput: string, setSubscriptionIdInput: (v: string) => void) => {
      if (!subscriptionIdInput) {
        toast.error("Enter a subscription ID.");
        return;
      }
      const subId = BigInt(subscriptionIdInput);

      const hash = await runWrite(
        "Updating Subscription",
        "Subscription update failed",
        (client) => {
          const contract = getContract({
            client,
            chain: base,
            address: lootboxAddress,
            abi: gnarsLootboxV4Abi,
          });
          return prepareContractCall({
            contract,
            method: "setSubscriptionId",
            params: [subId],
          });
        },
      );

      if (hash) {
        toast.success("Subscription update submitted.");
        setSubscriptionIdInput("");
      }
    },
    [lootboxAddress, runWrite],
  );

  const handleSetVrfConfig = useCallback(
    async (vrfConfigForm: {
      callbackGasLimit: string;
      requestConfirmations: string;
      numWords: string;
      keyHash: string;
    }) => {
      const {
        callbackGasLimit,
        requestConfirmations,
        numWords,
        keyHash: keyHashInput,
      } = vrfConfigForm;
      if (!callbackGasLimit || !requestConfirmations || !numWords || !keyHashInput) {
        toast.error("Fill in all VRF config fields.");
        return;
      }
      const gasLimitValue = Number.parseInt(callbackGasLimit, 10);
      const confirmationsValue = Number.parseInt(requestConfirmations, 10);
      const numWordsValue = Number.parseInt(numWords, 10);
      if (
        Number.isNaN(gasLimitValue) ||
        Number.isNaN(confirmationsValue) ||
        Number.isNaN(numWordsValue)
      ) {
        toast.error("VRF numeric fields must be valid numbers.");
        return;
      }

      const hash = await runWrite("Updating VRF Config", "VRF config update failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: lootboxAddress,
          abi: gnarsLootboxV4Abi,
        });
        return prepareContractCall({
          contract,
          method: "setVrfConfig",
          params: [gasLimitValue, confirmationsValue, numWordsValue, keyHashInput as `0x${string}`],
        });
      });

      if (hash) {
        toast.success("VRF config update submitted.");
      }
    },
    [lootboxAddress, runWrite],
  );

  const handleRetryOpen = useCallback(
    async (retryRequestId: string, setRetryRequestId: (v: string) => void) => {
      if (!retryRequestId) {
        toast.error("Enter a request ID.");
        return;
      }
      const requestId = BigInt(retryRequestId);

      const hash = await runWrite("Retrying Open", "Retry failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: lootboxAddress,
          abi: gnarsLootboxV4Abi,
        });
        return prepareContractCall({
          contract,
          method: "retryOpen",
          params: [requestId],
        });
      });

      if (hash) {
        toast.success("Retry submitted.");
        setRetryRequestId("");
      }
    },
    [lootboxAddress, runWrite],
  );

  const handleCancelOpen = useCallback(
    async (cancelRequestId: string, setCancelRequestId: (v: string) => void) => {
      if (!cancelRequestId) {
        toast.error("Enter a request ID.");
        return;
      }
      const requestId = BigInt(cancelRequestId);

      const hash = await runWrite("Cancelling Open", "Cancel failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: lootboxAddress,
          abi: gnarsLootboxV4Abi,
        });
        return prepareContractCall({
          contract,
          method: "cancelOpen",
          params: [requestId],
        });
      });

      if (hash) {
        toast.success("Cancel submitted.");
        setCancelRequestId("");
      }
    },
    [lootboxAddress, runWrite],
  );

  const handleSetFlexConfig = useCallback(
    async (flexConfigForm: {
      minFlexEth: string;
      flexNothingBps: string;
      flexNftBpsMin: string;
      flexNftBpsMax: string;
      flexNftBpsPerEth: string;
      flexGnarsBase: string;
      flexGnarsPerEth: string;
    }) => {
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
        toast.error("Flex config numeric fields must be valid numbers.");
        return;
      }
      const flexGnarsBaseValue = parseGnarsInput(flexGnarsBaseInput, gnarsUnit ?? undefined);
      const flexGnarsPerEthValue = parseGnarsInput(flexGnarsPerEthInput, gnarsUnit ?? undefined);

      const hash = await runWrite(
        "Updating Flex Config",
        "Flex config update failed",
        (client) => {
          const contract = getContract({
            client,
            chain: base,
            address: lootboxAddress,
            abi: gnarsLootboxV4Abi,
          });
          return prepareContractCall({
            contract,
            method: "setFlexConfig",
            params: [
              minFlexEthValue,
              flexNothingBpsValue,
              flexNftBpsMinValue,
              flexNftBpsMaxValue,
              flexNftBpsPerEthValue,
              flexGnarsBaseValue,
              flexGnarsPerEthValue,
            ],
          });
        },
      );

      if (hash) {
        toast.success("Flex config update submitted.");
      }
    },
    [gnarsUnit, lootboxAddress, runWrite],
  );

  const handlePause = useCallback(async () => {
    const hash = await runWrite("Pausing contract", "Pause failed", (client) => {
      const contract = getContract({
        client,
        chain: base,
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
      });
      return prepareContractCall({
        contract,
        method: "pause",
        params: [],
      });
    });
    if (hash) toast.success("Pause submitted.");
  }, [lootboxAddress, runWrite]);

  const handleUnpause = useCallback(async () => {
    const hash = await runWrite("Unpausing contract", "Unpause failed", (client) => {
      const contract = getContract({
        client,
        chain: base,
        address: lootboxAddress,
        abi: gnarsLootboxV4Abi,
      });
      return prepareContractCall({
        contract,
        method: "unpause",
        params: [],
      });
    });
    if (hash) toast.success("Unpause submitted.");
  }, [lootboxAddress, runWrite]);

  const handleWithdrawGnars = useCallback(
    async (
      withdrawGnarsAmount: string,
      withdrawGnarsTo: string,
      setWithdrawGnarsAmount: (v: string) => void,
    ) => {
      if (!withdrawGnarsAmount) {
        toast.error("Enter a GNARS amount.");
        return;
      }
      const amount = parseGnarsInput(withdrawGnarsAmount, gnarsUnit ?? undefined);
      const to = (withdrawGnarsTo || address) as Address;
      if (!to) {
        toast.error("Recipient address missing.");
        return;
      }

      const hash = await runWrite("Withdrawing GNARS", "Withdraw GNARS failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: lootboxAddress,
          abi: gnarsLootboxV4Abi,
        });
        return prepareContractCall({
          contract,
          method: "withdrawGnars",
          params: [to, amount],
        });
      });

      if (hash) {
        toast.success("Withdraw GNARS submitted.");
        setWithdrawGnarsAmount("");
      }
    },
    [address, gnarsUnit, lootboxAddress, runWrite],
  );

  const handleWithdrawToken = useCallback(
    async (
      withdrawTokenAddress: string,
      withdrawTokenAmount: string,
      withdrawTokenTo: string,
      setWithdrawTokenAddress: (v: string) => void,
      setWithdrawTokenAmount: (v: string) => void,
    ) => {
      const tokenAddress = withdrawTokenAddress.trim();
      if (!tokenAddress || !withdrawTokenAmount) {
        toast.error("Enter token address and amount.");
        return;
      }
      if (tokenAddress.toLowerCase() === gnarsTokenAddress.toLowerCase()) {
        toast.error("Use Withdraw GNARS for the GNARS token.");
        return;
      }
      const amount = BigInt(withdrawTokenAmount);
      const to = (withdrawTokenTo || address) as Address;
      if (!to) {
        toast.error("Recipient address missing.");
        return;
      }

      const hash = await runWrite("Withdrawing token", "Withdraw token failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: lootboxAddress,
          abi: gnarsLootboxV4Abi,
        });
        return prepareContractCall({
          contract,
          method: "withdrawERC20",
          params: [tokenAddress as Address, to, amount],
        });
      });

      if (hash) {
        toast.success("Withdraw token submitted.");
        setWithdrawTokenAddress("");
        setWithdrawTokenAmount("");
      }
    },
    [address, gnarsTokenAddress, lootboxAddress, runWrite],
  );

  const handleWithdrawFlexNft = useCallback(
    async (
      withdrawNftAddress: string,
      withdrawNftTokenId: string,
      withdrawNftTo: string,
      setWithdrawNftAddress: (v: string) => void,
      setWithdrawNftTokenId: (v: string) => void,
    ) => {
      if (!withdrawNftAddress || !withdrawNftTokenId) {
        toast.error("Enter NFT address and token ID.");
        return;
      }
      const tokenId = BigInt(withdrawNftTokenId);
      const to = (withdrawNftTo || address) as Address;
      if (!to) {
        toast.error("Recipient address missing.");
        return;
      }

      const hash = await runWrite(
        "Withdrawing flex NFT",
        "Withdraw flex NFT failed",
        (client) => {
          const contract = getContract({
            client,
            chain: base,
            address: lootboxAddress,
            abi: gnarsLootboxV4Abi,
          });
          return prepareContractCall({
            contract,
            method: "withdrawFlexNft",
            params: [withdrawNftAddress as Address, tokenId, to],
          });
        },
      );

      if (hash) {
        toast.success("Withdraw flex NFT submitted.");
        setWithdrawNftAddress("");
        setWithdrawNftTokenId("");
      }
    },
    [address, lootboxAddress, runWrite],
  );

  const handleWithdrawERC721 = useCallback(
    async (
      withdrawNftAddress: string,
      withdrawNftTokenId: string,
      withdrawNftTo: string,
      setWithdrawNftAddress: (v: string) => void,
      setWithdrawNftTokenId: (v: string) => void,
    ) => {
      if (!withdrawNftAddress || !withdrawNftTokenId) {
        toast.error("Enter NFT address and token ID.");
        return;
      }
      const tokenId = BigInt(withdrawNftTokenId);
      const to = (withdrawNftTo || address) as Address;
      if (!to) {
        toast.error("Recipient address missing.");
        return;
      }

      const hash = await runWrite("Withdrawing NFT", "Withdraw NFT failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: lootboxAddress,
          abi: gnarsLootboxV4Abi,
        });
        return prepareContractCall({
          contract,
          method: "withdrawERC721",
          params: [withdrawNftAddress as Address, tokenId, to],
        });
      });

      if (hash) {
        toast.success("Withdraw NFT submitted.");
        setWithdrawNftAddress("");
        setWithdrawNftTokenId("");
      }
    },
    [address, lootboxAddress, runWrite],
  );

  const handleWithdrawEth = useCallback(
    async (
      withdrawEthAmount: string,
      withdrawEthTo: string,
      setWithdrawEthAmount: (v: string) => void,
    ) => {
      if (!withdrawEthAmount) {
        toast.error("Enter an ETH amount.");
        return;
      }
      const amount = parseEther(withdrawEthAmount);
      const to = (withdrawEthTo || address) as Address;
      if (!to) {
        toast.error("Recipient address missing.");
        return;
      }

      const hash = await runWrite("Withdrawing ETH", "Withdraw ETH failed", (client) => {
        const contract = getContract({
          client,
          chain: base,
          address: lootboxAddress,
          abi: gnarsLootboxV4Abi,
        });
        return prepareContractCall({
          contract,
          method: "withdrawETH",
          params: [to, amount],
        });
      });

      if (hash) {
        toast.success("Withdraw ETH submitted.");
        setWithdrawEthAmount("");
      }
    },
    [address, lootboxAddress, runWrite],
  );

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
