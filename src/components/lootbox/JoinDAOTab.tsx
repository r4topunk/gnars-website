import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { AddressDisplay } from "@/components/ui/address-display";
import { formatEther, parseEther } from "viem";
import { Sparkles, Gift, TrendingUp } from "lucide-react";
import { formatGnarsAmount } from "@/lib/lootbox";
import type { Chain } from "wagmi/chains";

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
          <div className="p-6 space-y-4">
            <CardTitle className="text-xl flex items-center gap-2">
              Get Your GNARS <Sparkles className="h-4 w-4" />
            </CardTitle>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">How much ETH to contribute?</label>
                <Input
                  value={flexEth}
                  onChange={(event) => setFlexEth(event.target.value)}
                  placeholder="0.0002"
                  className="text-lg"
                />
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
                  <span>{flexGnarsBase !== null && flexGnarsBase !== undefined ? formatGnarsAmount(flexGnarsBase, gnarsUnit) : "-"} GNARS</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Per ETH bonus:</span>
                  <span>+{flexGnarsPerEth !== null && flexGnarsPerEth !== undefined ? formatGnarsAmount(flexGnarsPerEth, gnarsUnit) : "-"} GNARS</span>
                </div>
                <div className="flex items-center justify-between text-purple-400">
                  <span>NFT odds range:</span>
                  <span>{flexNftBpsMin !== null && flexNftBpsMin !== undefined ? (Number(flexNftBpsMin) / 100).toFixed(2) : "-"}% - {flexNftBpsMax !== null && flexNftBpsMax !== undefined ? (Number(flexNftBpsMax) / 100).toFixed(2) : "-"}%</span>
                </div>
                <div className="flex items-center justify-between text-purple-400">
                  <span>NFT boost per ETH:</span>
                  <span>+{flexNftBpsPerEth !== null && flexNftBpsPerEth !== undefined ? (Number(flexNftBpsPerEth) / 100).toFixed(2) : "-"}%</span>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleOpenFlex} disabled={!isConnected || !!isPaused}>
                {!isConnected ? "Connect Wallet to Join" : isPaused ? "Contract Paused" : "Join Gnars DAO"}
              </Button>
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