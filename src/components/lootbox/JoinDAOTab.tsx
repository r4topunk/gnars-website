import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { AddressDisplay } from "@/components/ui/address-display";
import { formatEther, parseEther } from "viem";
import { Sparkles, Gift, TrendingUp, ChevronUp, ChevronDown, Zap, Trophy, Coins } from "lucide-react";
import { formatGnarsAmount } from "@/lib/lootbox";
import type { Chain } from "wagmi/chains";
import { useCallback, useMemo } from "react";

interface JoinDAOTabProps {
  flexEth: string;
  setFlexEth: (value: string) => void;
  gnarsChance: number;
  nftChance: number;
  nothingChance: number;
  flexGnarsBase: bigint | null;
  flexGnarsPerEth: bigint | null;
  flexNftBpsMin: bigint | number | null;
  flexNftBpsMax: bigint | number | null;
  flexNftBpsPerEth: bigint | number | null;
  gnarsUnit: bigint | undefined;
  handleOpenFlex: () => void;
  isConnected: boolean;
  isPaused: boolean | null;
  lootboxAddress: string;
  refetch: () => void;
  isFetching: boolean;
  contractGnarsBalance: bigint | undefined;
  flexStats: readonly [bigint, bigint, bigint] | null;
  minFlexEth: bigint | null;
  chain: Chain | undefined;
  pendingLabel: string | null;
  isConfirming: boolean;
  isConfirmed: boolean;
  flexNftCountsReady: boolean;
  flexNftCounts: { gnars: number; hacker: number; total: number };
}

export function JoinDAOTab({
  flexEth,
  setFlexEth,
  gnarsChance,
  nftChance,
  nothingChance,
  flexGnarsBase,
  flexGnarsPerEth,
  flexNftBpsMin,
  flexNftBpsMax,
  flexNftBpsPerEth,
  gnarsUnit,
  handleOpenFlex,
  isConnected,
  isPaused,
  lootboxAddress,
  refetch,
  isFetching,
  contractGnarsBalance,
  flexStats,
  minFlexEth,
  chain,
  pendingLabel,
  isConfirming,
  isConfirmed,
  flexNftCountsReady,
  flexNftCounts,
}: JoinDAOTabProps) {
  // Step increment for the arrows (0.002 ETH)
  const STEP = 0.002;
  const MIN_ETH = 0.0002;

  // Parse current value
  const currentValue = useMemo(() => {
    const parsed = parseFloat(flexEth);
    return isNaN(parsed) ? MIN_ETH : parsed;
  }, [flexEth]);

  // Calculate expected GNARS reward
  const expectedGnars = useMemo(() => {
    if (!flexGnarsBase || !flexGnarsPerEth || !gnarsUnit) return null;
    try {
      const ethValue = parseEther(flexEth || "0");
      const gnarsReward = flexGnarsBase + (ethValue * flexGnarsPerEth) / parseEther("1");
      return formatGnarsAmount(gnarsReward, gnarsUnit);
    } catch {
      return null;
    }
  }, [flexEth, flexGnarsBase, flexGnarsPerEth, gnarsUnit]);

  // Increment/decrement handlers
  const handleIncrement = useCallback(() => {
    const newValue = Math.max(MIN_ETH, currentValue + STEP);
    setFlexEth(newValue.toFixed(4).replace(/\.?0+$/, "").replace(/\.$/, ""));
  }, [currentValue, setFlexEth]);

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(MIN_ETH, currentValue - STEP);
    setFlexEth(newValue.toFixed(4).replace(/\.?0+$/, "").replace(/\.$/, ""));
  }, [currentValue, setFlexEth]);

  // Handle direct input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty, numbers, and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFlexEth(value);
    }
  }, [setFlexEth]);

  return (
    <TabsContent value="join" className="space-y-8">
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
          <div className="p-6 space-y-6">
            <CardTitle className="text-xl flex items-center gap-2">
              Get Your GNARS <Sparkles className="h-4 w-4 text-yellow-500" />
            </CardTitle>

            {/* Big Interactive ETH Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Contribute ETH</label>
              <div className="flex items-center gap-2">
                {/* Decrement Button */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 shrink-0 rounded-xl border-2 hover:bg-primary/10 hover:border-primary transition-all"
                  onClick={handleDecrement}
                  disabled={currentValue <= MIN_ETH}
                >
                  <ChevronDown className="h-6 w-6" />
                </Button>

                {/* Big Number Input */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={flexEth}
                    onChange={handleInputChange}
                    className="w-full h-14 text-center text-3xl font-bold bg-secondary/30 border-2 border-border rounded-xl focus:border-primary focus:outline-none transition-colors"
                    placeholder="0.002"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground font-medium">
                    ETH
                  </span>
                </div>

                {/* Increment Button */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 shrink-0 rounded-xl border-2 hover:bg-primary/10 hover:border-primary transition-all"
                  onClick={handleIncrement}
                >
                  <ChevronUp className="h-6 w-6" />
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Use arrows to adjust by 0.002 ETH
              </p>
            </div>

            {/* Fun Rewards Display */}
            <div className="grid grid-cols-2 gap-3">
              {/* GNARS Reward Card */}
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-yellow-500">
                  <Coins className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">You Get</span>
                </div>
                <p className="text-2xl font-bold text-yellow-400">
                  {expectedGnars || "..."} 
                </p>
                <p className="text-xs text-yellow-500/70">GNARS tokens</p>
              </div>

              {/* NFT Odds Card */}
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-purple-400">
                  <Trophy className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">NFT Chance</span>
                </div>
                <p className="text-2xl font-bold text-purple-400">
                  {nftChance.toFixed(2)}%
                </p>
                <p className="text-xs text-purple-500/70">Bonus drop odds</p>
              </div>
            </div>

            {/* Chance Bars */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Reward Breakdown</p>
              
              {/* GNARS Chance Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-green-500" /> GNARS tokens
                  </span>
                  <span className="font-bold text-green-500">{gnarsChance.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(gnarsChance, 100)}%` }}
                  />
                </div>
              </div>

              {/* NFT Chance Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Gift className="h-3 w-3 text-purple-500" /> Bonus NFT
                  </span>
                  <span className="font-bold text-purple-500">{nftChance.toFixed(2)}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(nftChance, 100)}%` }}
                  />
                </div>
              </div>

              {/* Nothing Chance Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">🔄 Try again</span>
                  <span className="font-medium text-muted-foreground">{nothingChance.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-muted-foreground/30 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(nothingChance, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Join Button */}
            <Button 
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90" 
              size="lg" 
              onClick={handleOpenFlex} 
              disabled={!isConnected || !!isPaused}
            >
              {!isConnected ? "Connect Wallet to Join" : isPaused ? "Contract Paused" : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Join Gnars DAO
                  <Sparkles className="h-5 w-5" />
                </span>
              )}
            </Button>

            {/* Contract Stats Mini */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>Min: {minFlexEth ? formatEther(minFlexEth) : "0.0002"} ETH</span>
              <span>•</span>
              <span>{flexStats ? `${flexStats[0].toString()} NFTs` : "..."} in pool</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Onboarding Contract</CardTitle>
            <AddressDisplay address={lootboxAddress} />
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
              {isFetching ? "..." : contractGnarsBalance !== undefined ? formatGnarsAmount(contractGnarsBalance, gnarsUnit) : "-"} GNARS
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
              {minFlexEth !== null && minFlexEth !== undefined ? `${formatEther(minFlexEth)} ETH` : "-"}
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

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5" /> Transaction status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Network: {chain?.id === 8453 ? "Base" : chain?.name ?? "Not connected"}</p>
          <p>Pending: {pendingLabel ?? "None"}</p>
          <p>Status: {isConfirming ? "Confirming..." : isConfirmed ? "Confirmed" : "Idle"}</p>
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

      <Card className="bg-card border-2 border-primary/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> NFT Odds: More ETH = Better Chance
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Your NFT odds increase with your ETH contribution. Here are some examples:
          </p>
        </CardHeader>
        <CardContent>
          {minFlexEth !== null && minFlexEth !== undefined &&
           flexNftBpsMin !== null && flexNftBpsMin !== undefined &&
           flexNftBpsMax !== null && flexNftBpsMax !== undefined ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                parseEther("0.0002"),
                parseEther("0.001"),
                parseEther("0.005"),
                parseEther("0.01"),
              ].map((ethAmount, idx) => {
                // Calculate NFT chance for this amount
                let nftBps = Number(flexNftBpsMin);
                if (ethAmount > minFlexEth && flexNftBpsPerEth && flexNftBpsPerEth > 0n) {
                  const extra = ((ethAmount - minFlexEth) * BigInt(flexNftBpsPerEth)) / parseEther("1");
                  nftBps = Math.min(Number(flexNftBpsMin) + Number(extra), Number(flexNftBpsMax));
                }
                const nftChancePercent = (nftBps / 100).toFixed(2);
                const isMax = nftBps >= Number(flexNftBpsMax);

                return (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-muted/50 to-muted/20 p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Contribute
                      </div>
                      <div className="text-2xl font-bold">
                        {formatEther(ethAmount)} ETH
                      </div>
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="text-xs text-muted-foreground mb-1">
                          NFT Odds
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold text-primary">
                            {nftChancePercent}%
                          </span>
                          {isMax && (
                            <Badge variant="secondary" className="text-xs">
                              MAX
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Visual progress bar */}
                    <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary/50 to-primary transition-all"
                        style={{ width: `${Math.min(Number(nftChancePercent), 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              {isFetching ? "Loading..." : "Contract data not available"}
            </div>
          )}

          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">How it works</p>
                <p className="text-xs text-muted-foreground">
                  The more ETH you contribute, the higher your chance of winning a bonus NFT.
                  {flexNftBpsPerEth !== null && flexNftBpsPerEth !== undefined && flexNftBpsPerEth > 0n ? (
                    <> You get <span className="font-semibold text-foreground">+{(Number(flexNftBpsPerEth) / 100).toFixed(2)}%</span> odds per ETH contributed.</>
                  ) : (
                    <> NFT odds are fixed at <span className="font-semibold text-foreground">{flexNftBpsMin !== null && flexNftBpsMin !== undefined ? (Number(flexNftBpsMin) / 100).toFixed(2) : "-"}%</span> for all contributions.</>
                  )}
                  {" "}Maximum odds: <span className="font-semibold text-foreground">{flexNftBpsMax !== null && flexNftBpsMax !== undefined ? (Number(flexNftBpsMax) / 100).toFixed(2) : "-"}%</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}