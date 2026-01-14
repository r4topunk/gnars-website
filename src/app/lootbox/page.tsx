"use client";

import { useCallback, useEffect, useState } from "react";
import { Address, isAddress } from "viem";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  JoinDAOTab, 
  AdminTab 
} from "@/components/lootbox";
import { useLootboxContract } from "@/hooks/use-lootbox-contract";
import { useLootboxActions } from "@/hooks/use-lootbox-actions";
import { DEFAULT_LOOTBOX_ADDRESS } from "@/lib/lootbox";

export default function LootboxPage() {
  // Lootbox address state
  const [lootboxAddress, setLootboxAddress] = useState<Address>(DEFAULT_LOOTBOX_ADDRESS);
  const [lootboxAddressInput, setLootboxAddressInput] = useState<string>(DEFAULT_LOOTBOX_ADDRESS);
  const [flexEth, setFlexEth] = useState("0.0002");
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  // Persist lootbox address in localStorage
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

  // Transaction state handlers
  const handleTransactionError = useCallback(() => {
    setPendingHash(undefined);
    setPendingLabel(null);
  }, []);

  const handleTransactionConfirmed = useCallback(() => {
    const cleanupTimer = setTimeout(() => {
      setPendingHash(undefined);
      setPendingLabel(null);
    }, 4000);
    return () => clearTimeout(cleanupTimer);
  }, []);

  // Contract hook
  const contract = useLootboxContract({
    lootboxAddress,
    flexEth,
    pendingHash,
    onTransactionError: handleTransactionError,
    onTransactionConfirmed: handleTransactionConfirmed,
  });

  // Actions hook
  const actions = useLootboxActions({
    lootboxAddress,
    gnarsTokenAddress: contract.gnarsTokenAddress,
    gnarsUnit: contract.gnarsUnit,
    walletGnarsBalance: contract.walletGnarsBalance,
    gnarsAllowance: contract.gnarsAllowance,
    setPendingHash,
    setPendingLabel,
  });

  // Lootbox address handlers
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

  // Wrapper for handleOpenFlex from JoinDAOTab
  const handleOpenFlex = useCallback(() => {
    actions.handleOpenFlex(flexEth);
  }, [actions, flexEth]);

  // Wrapper for handleOpenFlexWithAmount from Experience3DTab
  const handleOpenFlexWithAmount = useCallback((ethAmount: string) => {
    actions.handleOpenFlex(ethAmount);
  }, [actions]);

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Gnars Lootbox</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Join Gnars DAO by getting GNARS governance tokens. Contribute ETH to receive GNARS tokens, with a chance to win bonus NFTs. The more you contribute, the more GNARS you receive and the better your odds of winning an NFT.
        </p>
      </div>

      <Tabs defaultValue="join" className="space-y-8">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="join">Join DAO</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <JoinDAOTab
          flexEth={flexEth}
          setFlexEth={setFlexEth}
          gnarsChance={contract.gnarsChance}
          nftChance={contract.nftChance}
          nothingChance={contract.nothingChance}
          flexGnarsBase={contract.flexGnarsBase}
          flexGnarsPerEth={contract.flexGnarsPerEth}
          flexNftBpsMin={contract.flexNftBpsMin}
          flexNftBpsMax={contract.flexNftBpsMax}
          flexNftBpsPerEth={contract.flexNftBpsPerEth}
          gnarsUnit={contract.gnarsUnit}
          handleOpenFlex={handleOpenFlex}
          isConnected={contract.isConnected}
          isPaused={contract.isPaused}
          lootboxAddress={lootboxAddress}
          refetch={contract.refetch}
          isFetching={contract.isFetching}
          contractGnarsBalance={contract.contractGnarsBalance}
          flexStats={contract.flexStats}
          minFlexEth={contract.minFlexEth}
          chain={contract.chain}
          pendingLabel={pendingLabel}
          isConfirming={contract.isConfirming}
          isConfirmed={contract.isConfirmed}
          flexNftCountsReady={contract.flexNftCountsReady}
          flexNftCounts={contract.flexNftCounts}
          address={contract.address}
          onOpenWithAmount={handleOpenFlexWithAmount}
        />

        <AdminTab
          // Lootbox address management
          lootboxAddress={lootboxAddress}
          lootboxAddressInput={lootboxAddressInput}
          setLootboxAddressInput={setLootboxAddressInput}
          handleUseLootboxAddress={handleUseLootboxAddress}
          handleResetLootboxAddress={handleResetLootboxAddress}

          // Contract data
          owner={contract.owner}
          treasury={contract.treasury}
          subscriptionId={contract.subscriptionId}
          keyHash={contract.keyHash}
          callbackGasLimit={contract.callbackGasLimit}
          requestConfirmations={contract.requestConfirmations}
          numWords={contract.numWords}
          minFlexEth={contract.minFlexEth}
          flexNothingBps={contract.flexNothingBps}
          flexNftBpsMin={contract.flexNftBpsMin}
          flexNftBpsMax={contract.flexNftBpsMax}
          flexNftBpsPerEth={contract.flexNftBpsPerEth}
          flexGnarsBase={contract.flexGnarsBase}
          flexGnarsPerEth={contract.flexGnarsPerEth}
          gnarsUnit={contract.gnarsUnit}
          gnarsTokenAddress={contract.gnarsTokenAddress}
          isPaused={contract.isPaused}
          flexStats={contract.flexStats}

          // Balances
          contractGnarsBalance={contract.contractGnarsBalance}
          walletGnarsBalance={contract.walletGnarsBalance}
          gnarsAllowance={contract.gnarsAllowance}
          lootboxEthBalance={contract.lootboxEthBalance}
          withdrawTokenBalance={contract.withdrawTokenBalance}

          // NFT counts
          flexNftCounts={contract.flexNftCounts}
          flexNftCountsReady={contract.flexNftCountsReady}

          // Allowlist status
          allowlistStatus={contract.allowlistStatus as boolean | undefined}
          depositNftStatus={contract.depositNftStatus as boolean | undefined}
          withdrawNftStatus={contract.withdrawNftStatus as boolean | undefined}

          // Pending open
          activeRequestId={contract.activeRequestId}
          pendingOpen={contract.pendingOpen}

          // Auth
          address={contract.address}
          isOwner={contract.isOwner}
          canAdmin={contract.canAdmin}

          // Loading states
          isFetching={contract.isFetching}
          refetch={contract.refetch}

          // Actions
          onDepositNFT={actions.handleDepositNFT}
          onDepositGnars={actions.handleDepositGnars}
          onApproveGnars={actions.handleApproveGnars}
          onSetAllowlist={actions.handleSetAllowlist}
          onSetTreasury={actions.handleSetTreasury}
          onSetSubscriptionId={actions.handleSetSubscriptionId}
          onSetVrfConfig={actions.handleSetVrfConfig}
          onRetryOpen={actions.handleRetryOpen}
          onCancelOpen={actions.handleCancelOpen}
          onSetFlexConfig={actions.handleSetFlexConfig}
          onPause={actions.handlePause}
          onUnpause={actions.handleUnpause}
          onWithdrawGnars={actions.handleWithdrawGnars}
          onWithdrawToken={actions.handleWithdrawToken}
          onWithdrawFlexNft={actions.handleWithdrawFlexNft}
          onWithdrawERC721={actions.handleWithdrawERC721}
          onWithdrawEth={actions.handleWithdrawEth}
        />
      </Tabs>
    </div>
  );
}
