"use client";

import { useMemo, useState } from "react";
import { Address, formatEther } from "viem";
import { Coins, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReadItem, AddressRenderer } from "@/components/lootbox";
import {
  DEFAULT_LOOTBOX_ADDRESS,
  CUSTOM_PRESET,
  NFT_PRESETS,
  TOKEN_PRESETS,
  formatGnarsAmount,
  matchPreset,
  formatPresetLabel,
  formatOptional,
  formatAllowlistStatus,
  ZERO_ADDRESS,
} from "@/lib/lootbox";

interface AdminTabProps {
  // Lootbox address management
  lootboxAddress: Address;
  lootboxAddressInput: string;
  setLootboxAddressInput: (value: string) => void;
  handleUseLootboxAddress: () => void;
  handleResetLootboxAddress: () => void;

  // Contract data
  owner: unknown;
  treasury: unknown;
  subscriptionId: bigint | number;
  keyHash: unknown;
  callbackGasLimit: bigint | number;
  requestConfirmations: bigint | number;
  numWords: bigint | number;
  minFlexEth: bigint | number;
  flexNothingBps: bigint | number;
  flexNftBpsMin: bigint | number;
  flexNftBpsMax: bigint | number;
  flexNftBpsPerEth: bigint | number;
  flexGnarsBase: bigint | number;
  flexGnarsPerEth: bigint | number;
  gnarsUnit: bigint | number;
  gnarsTokenAddress: Address;
  isPaused: boolean | null;
  flexStats: readonly [bigint, bigint, bigint] | null;

  // Balances
  contractGnarsBalance: bigint | undefined;
  walletGnarsBalance: bigint | undefined;
  gnarsAllowance: bigint | undefined;
  lootboxEthBalance: { value: bigint } | undefined;
  withdrawTokenBalance: bigint | undefined;

  // NFT counts
  flexNftCounts: { gnars: number; hacker: number; total: number };
  flexNftCountsReady: boolean;

  // Allowlist status
  allowlistStatus: boolean | undefined;
  depositNftStatus: boolean | undefined;
  withdrawNftStatus: boolean | undefined;

  // Pending open
  activeRequestId: bigint | null;
  pendingOpen: {
    user: Address;
    paid: bigint;
    flexGnarsPayout: bigint;
    flexNothingBps: number;
    flexNftBps: number;
    fulfilled: boolean;
    flexNftReserved: boolean;
  } | null;

  // Auth
  address: Address | undefined;
  isOwner: boolean;
  canAdmin: boolean;

  // Loading states
  isFetching: boolean;
  refetch: () => void;

  // Actions
  onDepositNFT: (
    nftContract: string,
    nftTokenId: string,
    setNftContract: (v: string) => void,
    setNftTokenId: (v: string) => void
  ) => void;
  onDepositGnars: (gnarsAmount: string, setGnarsAmount: (v: string) => void) => void;
  onApproveGnars: (approveGnarsAmount: string, gnarsAmount: string) => void;
  onSetAllowlist: (allowlistNft: string, allowlistEnabled: boolean, setAllowlistNft: (v: string) => void) => void;
  onSetTreasury: (treasuryInput: string, setTreasuryInput: (v: string) => void) => void;
  onSetSubscriptionId: (subscriptionIdInput: string, setSubscriptionIdInput: (v: string) => void) => void;
  onSetVrfConfig: (vrfConfigForm: {
    callbackGasLimit: string;
    requestConfirmations: string;
    numWords: string;
    keyHash: string;
  }) => void;
  onRetryOpen: (retryRequestId: string, setRetryRequestId: (v: string) => void) => void;
  onCancelOpen: (cancelRequestId: string, setCancelRequestId: (v: string) => void) => void;
  onSetFlexConfig: (flexConfigForm: {
    minFlexEth: string;
    flexNothingBps: string;
    flexNftBpsMin: string;
    flexNftBpsMax: string;
    flexNftBpsPerEth: string;
    flexGnarsBase: string;
    flexGnarsPerEth: string;
  }) => void;
  onPause: () => void;
  onUnpause: () => void;
  onWithdrawGnars: (withdrawGnarsAmount: string, withdrawGnarsTo: string, setWithdrawGnarsAmount: (v: string) => void) => void;
  onWithdrawToken: (
    withdrawTokenAddress: string,
    withdrawTokenAmount: string,
    withdrawTokenTo: string,
    setWithdrawTokenAddress: (v: string) => void,
    setWithdrawTokenAmount: (v: string) => void
  ) => void;
  onWithdrawFlexNft: (
    withdrawNftAddress: string,
    withdrawNftTokenId: string,
    withdrawNftTo: string,
    setWithdrawNftAddress: (v: string) => void,
    setWithdrawNftTokenId: (v: string) => void
  ) => void;
  onWithdrawERC721: (
    withdrawNftAddress: string,
    withdrawNftTokenId: string,
    withdrawNftTo: string,
    setWithdrawNftAddress: (v: string) => void,
    setWithdrawNftTokenId: (v: string) => void
  ) => void;
  onWithdrawEth: (withdrawEthAmount: string, withdrawEthTo: string, setWithdrawEthAmount: (v: string) => void) => void;
}

export function AdminTab({
  lootboxAddress,
  lootboxAddressInput,
  setLootboxAddressInput,
  handleUseLootboxAddress,
  handleResetLootboxAddress,
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
  contractGnarsBalance,
  walletGnarsBalance,
  gnarsAllowance,
  lootboxEthBalance,
  withdrawTokenBalance,
  flexNftCounts,
  flexNftCountsReady,
  allowlistStatus,
  depositNftStatus,
  withdrawNftStatus,
  activeRequestId,
  pendingOpen,
  address,
  isOwner,
  canAdmin,
  isFetching,
  refetch,
  onDepositNFT,
  onDepositGnars,
  onApproveGnars,
  onSetAllowlist,
  onSetTreasury,
  onSetSubscriptionId,
  onSetVrfConfig,
  onRetryOpen,
  onCancelOpen,
  onSetFlexConfig,
  onPause,
  onUnpause,
  onWithdrawGnars,
  onWithdrawToken,
  onWithdrawFlexNft,
  onWithdrawERC721,
  onWithdrawEth,
}: AdminTabProps) {
  // Local form state
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
  const [flexConfigForm, setFlexConfigForm] = useState({
    minFlexEth: "",
    flexNothingBps: "",
    flexNftBpsMin: "",
    flexNftBpsMax: "",
    flexNftBpsPerEth: "",
    flexGnarsBase: "",
    flexGnarsPerEth: "",
  });

  // Preset matching
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

  return (
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
                placeholder={minFlexEth ? formatEther(BigInt(minFlexEth)) : "0.0002"}
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
          <Button className="w-full" onClick={() => onSetFlexConfig(flexConfigForm)} disabled={!canAdmin}>
            {canAdmin ? "Update Flex Config" : "Owner Only"}
          </Button>
          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Current</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <ReadItem
                label="Min Flex ETH"
                value={minFlexEth !== null ? `${formatEther(BigInt(minFlexEth))} ETH` : "-"}
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
          <Button className="w-full" onClick={() => onSetAllowlist(allowlistNft, allowlistEnabled, setAllowlistNft)} disabled={!canAdmin}>
            {canAdmin ? "Update Allowlist" : "Owner Only"}
          </Button>
          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Current</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <ReadItem label="Selected NFT" value={<AddressRenderer value={allowlistNft || null} />} />
              <ReadItem
                label="Allowlisted"
                value={formatAllowlistStatus(allowlistNft, allowlistStatus)}
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
            <Button variant="outline" onClick={onPause} disabled={!canAdmin}>
              {canAdmin ? "Pause Contract" : "Owner Only"}
            </Button>
            <Button variant="outline" onClick={onUnpause} disabled={!canAdmin}>
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
          <Button className="w-full" onClick={() => onSetTreasury(treasuryInput, setTreasuryInput)} disabled={!canAdmin}>
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
          <Button className="w-full" onClick={() => onSetSubscriptionId(subscriptionIdInput, setSubscriptionIdInput)} disabled={!canAdmin}>
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
          <Button className="w-full" onClick={() => onSetVrfConfig(vrfConfigForm)} disabled={!canAdmin}>
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
              <Button variant="outline" onClick={() => onRetryOpen(retryRequestId, setRetryRequestId)} disabled={!canAdmin}>
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
              <Button variant="outline" onClick={() => onCancelOpen(cancelRequestId, setCancelRequestId)} disabled={!canAdmin}>
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
            onClick={() => onDepositNFT(nftContract, nftTokenId, setNftContract, setNftTokenId)} 
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
                value={formatAllowlistStatus(nftContract, depositNftStatus)}
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
                <Button variant="outline" onClick={() => onApproveGnars(approveGnarsAmount, gnarsAmount)} disabled={!canAdmin}>
                  {canAdmin ? "Approve" : "Owner Only"}
                </Button>
                <Button className="w-full" onClick={() => onDepositGnars(gnarsAmount, setGnarsAmount)} disabled={!canAdmin}>
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
              <Button className="w-full" onClick={() => onWithdrawGnars(withdrawGnarsAmount, withdrawGnarsTo, setWithdrawGnarsAmount)} disabled={!canAdmin}>
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
          <Button className="w-full" onClick={() => onWithdrawToken(withdrawTokenAddress, withdrawTokenAmount, withdrawTokenTo, setWithdrawTokenAddress, setWithdrawTokenAmount)} disabled={!canAdmin}>
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
            <Button variant="outline" onClick={() => onWithdrawFlexNft(withdrawNftAddress, withdrawNftTokenId, withdrawNftTo, setWithdrawNftAddress, setWithdrawNftTokenId)} disabled={!canAdmin}>
              {canAdmin ? "Withdraw Flex NFT" : "Owner Only"}
            </Button>
            <Button variant="outline" onClick={() => onWithdrawERC721(withdrawNftAddress, withdrawNftTokenId, withdrawNftTo, setWithdrawNftAddress, setWithdrawNftTokenId)} disabled={!canAdmin}>
              {canAdmin ? "Rescue ERC721" : "Owner Only"}
            </Button>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Current</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <ReadItem label="NFT address" value={<AddressRenderer value={withdrawNftAddress || null} />} />
              <ReadItem
                label="Allowlisted"
                value={formatAllowlistStatus(withdrawNftAddress, withdrawNftStatus)}
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
          <Button className="w-full" onClick={() => onWithdrawEth(withdrawEthAmount, withdrawEthTo, setWithdrawEthAmount)} disabled={!canAdmin}>
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
  );
}
