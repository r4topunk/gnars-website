"use client";

import { useCallback, useMemo, useState } from "react";
import { Gift, Sparkles } from "lucide-react";
import { Address, formatEther, formatUnits, parseEther } from "viem";
import { base } from "wagmi/chains";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AddressDisplay } from "@/components/ui/address-display";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import gnarsLootboxV3Abi from "@/utils/abis/gnarsLootboxV3Abi";

const LOOTBOX_ADDRESS = GNARS_ADDRESSES.lootboxV3 as Address;
const GNARS_TOKEN_ADDRESS = GNARS_ADDRESSES.gnarsErc20 as Address;
const GNARS_UNIT_18 = 10n ** 18n;

// Simple ERC20 ABI for balance check
const erc20BalanceAbi = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Proposed config for simulation preview
const PROPOSED_CONFIG = {
  flexNftBpsMin: 50,      // 0.5% minimum
  flexNftBpsMax: 500,     // 5% maximum
  flexNftBpsPerEth: 5000, // +0.5% per 0.1 ETH
  minFlexEth: 200000000000000n, // 0.0002 ETH
};

function formatGnarsAmount(amount: bigint, gnarsUnit?: bigint) {
  if (!gnarsUnit || gnarsUnit === 0n) return amount.toString();
  if (gnarsUnit === GNARS_UNIT_18) return formatUnits(amount, 18);
  return (amount / gnarsUnit).toString();
}

export default function LootboxPage() {
  const { address, isConnected, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [flexEth, setFlexEth] = useState("0.0002");
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [simulateScaling, setSimulateScaling] = useState(false);

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
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
      { address: LOOTBOX_ADDRESS, abi: gnarsLootboxV3Abi, functionName: "minFlexEth" },
      { address: LOOTBOX_ADDRESS, abi: gnarsLootboxV3Abi, functionName: "flexNothingBps" },
      { address: LOOTBOX_ADDRESS, abi: gnarsLootboxV3Abi, functionName: "flexNftBpsMin" },
      { address: LOOTBOX_ADDRESS, abi: gnarsLootboxV3Abi, functionName: "flexNftBpsMax" },
      { address: LOOTBOX_ADDRESS, abi: gnarsLootboxV3Abi, functionName: "flexNftBpsPerEth" },
      { address: LOOTBOX_ADDRESS, abi: gnarsLootboxV3Abi, functionName: "flexGnarsBase" },
      { address: LOOTBOX_ADDRESS, abi: gnarsLootboxV3Abi, functionName: "flexGnarsPerEth" },
      { address: LOOTBOX_ADDRESS, abi: gnarsLootboxV3Abi, functionName: "gnarsUnit" },
      { address: LOOTBOX_ADDRESS, abi: gnarsLootboxV3Abi, functionName: "getFlexBalances" },
    ],
    query: { refetchInterval: false },
  });

  // V3: Separate hook for getFlexPreview so it updates reactively when flexValue changes
  const { data: flexPreviewData } = useReadContract({
    address: LOOTBOX_ADDRESS,
    abi: gnarsLootboxV3Abi,
    functionName: "getFlexPreview",
    args: [flexValue > 0n ? flexValue : parseEther("0.0002")],
    query: {
      enabled: true,
    },
  });

  // Read GNARS token balance of the lootbox contract
  const { data: contractGnarsBalance } = useReadContract({
    address: GNARS_TOKEN_ADDRESS,
    abi: erc20BalanceAbi,
    functionName: "balanceOf",
    args: [LOOTBOX_ADDRESS],
  });

  const [
    minFlexEth,
    flexNothingBps,
    flexNftBpsMin,
    flexNftBpsMax,
    flexNftBpsPerEth,
    flexGnarsBase,
    flexGnarsPerEth,
    gnarsUnit,
    flexBalances,
  ] = useMemo(() => {
    return [
      data?.[0]?.result ?? 0n,
      data?.[1]?.result ?? 0n,
      data?.[2]?.result ?? 0n,
      data?.[3]?.result ?? 0n,
      data?.[4]?.result ?? 0n,
      data?.[5]?.result ?? 0n,
      data?.[6]?.result ?? 0n,
      data?.[7]?.result ?? 0n,
      data?.[8]?.result ?? null,
    ] as const;
  }, [data]);

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
        address: LOOTBOX_ADDRESS,
        abi: gnarsLootboxV3Abi,
        functionName: "openFlexBox",
        value,
        chainId: base.id,
      });
      setPendingHash(hash);
      toast.success("Transaction submitted", {
        description: "Welcome to Gnars DAO! Getting your tokens...",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error("Transaction failed", { description: message });
      setPendingLabel(null);
    }
  }, [address, ensureBase, flexEth, isConnected, writeContractAsync]);

  const flexStats = flexBalances as
    | readonly [bigint, bigint, bigint]
    | null;

  // V3: Use getFlexPreview for accurate gnars payout calculation
  const flexGnarsPreview = useMemo(() => {
    // Use preview from contract if available, otherwise calculate locally
    if (flexPreviewData) {
      const previewResult = flexPreviewData as readonly [number, number, bigint];
      return previewResult[2];
    }
    if (flexValue === 0n) return 0n;
    return flexGnarsBase + (flexValue * flexGnarsPerEth) / 1_000_000_000_000_000_000n;
  }, [flexPreviewData, flexValue, flexGnarsBase, flexGnarsPerEth]);

  // V3: Use dynamic NFT chance from preview
  const previewNftBps = useMemo(() => {
    if (flexPreviewData) {
      const previewResult = flexPreviewData as readonly [number, number, bigint];
      return Number(previewResult[1]);
    }
    return Number(flexNftBpsMin);
  }, [flexPreviewData, flexNftBpsMin]);

  // Simulate NFT scaling with proposed config (for preview)
  const simulatedNftBps = useMemo(() => {
    if (!simulateScaling) return previewNftBps;

    // Replicate the contract's _flexNftBpsForPaid logic with proposed config
    const { flexNftBpsMin: simMin, flexNftBpsMax: simMax, flexNftBpsPerEth: simPerEth, minFlexEth: simMinEth } = PROPOSED_CONFIG;

    if (simMax === 0) return 0;
    if (flexValue <= simMinEth || simPerEth === 0) return simMin;

    const extra = Number((flexValue - simMinEth) * BigInt(simPerEth) / 1_000_000_000_000_000_000n);
    const result = simMin + extra;
    return Math.min(result, simMax);
  }, [simulateScaling, previewNftBps, flexValue]);

  const nothingChance = Number(flexNothingBps) / 100;
  const nftChance = (simulateScaling ? simulatedNftBps : previewNftBps) / 100;
  const gnarsChance = Math.max(0, 100 - nothingChance);

  return (
    <div className="py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Join Gnars DAO</h1>
        <p className="text-muted-foreground">
          Get started with GNARS governance tokens and a chance at bonus NFTs. Pay what you want—the more you contribute, the more GNARS you receive.
        </p>
      </div>

      <Card className="bg-card">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Onboarding Contract</CardTitle>
            <AddressDisplay address={LOOTBOX_ADDRESS} />
          </div>
          <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Refreshing..." : "Refresh data"}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Contract Balance</Badge>
            </div>
            <div className="text-lg font-semibold">
              {contractGnarsBalance ? formatGnarsAmount(contractGnarsBalance, gnarsUnit) : "-"} GNARS
            </div>
            <div className="text-xs text-muted-foreground">
              Total tokens in contract
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Rewards Pool</Badge>
              <span className="text-muted-foreground">Bonus NFTs</span>
            </div>
            <div className="text-lg font-semibold">
              {flexStats ? `${flexStats[0].toString()} NFTs` : "-"}
            </div>
            {flexStats && (
              <div className="text-xs text-muted-foreground">
                {formatGnarsAmount(flexStats[1], gnarsUnit)} available ·{" "}
                {formatGnarsAmount(flexStats[2], gnarsUnit)} reserved
              </div>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Entry Fee</Badge>
              <span className="text-muted-foreground">Minimum</span>
            </div>
            <div className="text-lg font-semibold">
              {minFlexEth ? `${formatEther(minFlexEth)} ETH` : "-"}
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Your Chances</Badge>
              <span className="text-muted-foreground">Rewards</span>
            </div>
            <div className="text-lg font-semibold">
              {gnarsChance.toFixed(0)}% GNARS
            </div>
            <div className="text-xs text-muted-foreground">
              {nftChance.toFixed(1)}% bonus NFT · {nothingChance.toFixed(1)}% try again
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-2 border-primary/20 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          {/* TCG Card Image - Left Side */}
          <div className="relative aspect-[3/4] md:aspect-auto bg-black">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/gnars-lootbox.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
              <Badge className="bg-purple-500/10 text-purple-200 border border-purple-500/30 backdrop-blur-sm">
                Gnars Onboarding Card
              </Badge>
              <h3 className="text-2xl font-bold">GNARS STARTER</h3>
              <p className="text-sm text-muted-foreground">
                Your entry to the DAO
              </p>
            </div>
          </div>

          {/* Purchase UI - Right Side */}
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-500/10 text-purple-200">Start Here</Badge>
                <CardTitle className="text-xl flex items-center gap-2">
                  Get Your GNARS <Sparkles className="h-4 w-4" />
                </CardTitle>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">How much ETH to contribute?</label>
                <Input
                  value={flexEth}
                  onChange={(event) => setFlexEth(event.target.value)}
                  placeholder="0.0002"
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  You&apos;ll receive: <span className="font-semibold text-foreground">{flexGnarsPreview > 0n ? formatGnarsAmount(flexGnarsPreview, gnarsUnit) : "-"} GNARS</span> tokens
                </p>
              </div>

              <div className="space-y-2 text-sm border-t pt-4">
                <p className="font-semibold text-foreground">Reward Chances:</p>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>🎯 GNARS tokens</span>
                    <span className="font-medium text-foreground">{gnarsChance.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>🎁 Bonus NFT</span>
                    <span className="font-medium text-foreground">{nftChance.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>🔄 Try again</span>
                    <span className="font-medium text-foreground">{nothingChance.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Base amount:</span>
                  <span>{flexGnarsBase ? formatGnarsAmount(flexGnarsBase, gnarsUnit) : "-"} GNARS</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Per ETH bonus:</span>
                  <span>+{flexGnarsPerEth ? formatGnarsAmount(flexGnarsPerEth, gnarsUnit) : "-"} GNARS</span>
                </div>
                <div className="flex items-center justify-between text-purple-400">
                  <span>NFT odds range:</span>
                  <span>{(Number(flexNftBpsMin) / 100).toFixed(2)}% - {(Number(flexNftBpsMax) / 100).toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between text-purple-400">
                  <span>NFT boost per ETH:</span>
                  <span>+{(Number(flexNftBpsPerEth) / 100).toFixed(2)}%</span>
                </div>
              </div>

              {/* Simulation toggle for previewing proposed NFT scaling */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="simulate" className="text-sm font-medium cursor-pointer">
                      Preview NFT Scaling
                    </label>
                    <p className="text-xs text-muted-foreground">
                      See how NFT odds would change with proposed config
                    </p>
                  </div>
                  <Switch
                    id="simulate"
                    checked={simulateScaling}
                    onCheckedChange={setSimulateScaling}
                  />
                </div>
                {simulateScaling && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-md p-3 space-y-2">
                    <p className="text-xs font-medium text-purple-300">Proposed Config (Preview Only)</p>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">NFT range:</span>
                        <span className="text-purple-300">{(PROPOSED_CONFIG.flexNftBpsMin / 100).toFixed(2)}% - {(PROPOSED_CONFIG.flexNftBpsMax / 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">NFT boost/ETH:</span>
                        <span className="text-purple-300">+{(PROPOSED_CONFIG.flexNftBpsPerEth / 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-muted-foreground">Your simulated NFT chance:</span>
                        <span className="text-purple-300">{(simulatedNftBps / 100).toFixed(2)}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-yellow-400 mt-2">
                      This is a preview only. Contract config has not been changed yet.
                    </p>
                  </div>
                )}
              </div>

              <Button className="w-full" size="lg" onClick={handleOpenFlex} disabled={!isConnected}>
                {isConnected ? "Join Gnars DAO" : "Connect Wallet to Join"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5" /> Transaction status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Network: {chain?.id === base.id ? "Base" : chain?.name ?? "Not connected"}</p>
          <p>Pending: {pendingLabel ?? "None"}</p>
          <p>Status: {isConfirming ? "Confirming..." : isConfirmed ? "Confirmed" : "Idle"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
