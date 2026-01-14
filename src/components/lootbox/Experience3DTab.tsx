import { AnimatedChest3D } from "@/components/lootbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { parseEther } from "viem";
import { formatGnarsAmount } from "@/lib/lootbox";
import { useState } from "react";

interface Experience3DTabProps {
  flexGnarsBase: bigint | null;
  flexGnarsPerEth: bigint | null;
  flexNftBpsMin: bigint | number | null;
  flexNftBpsMax: bigint | number | null;
  flexNftBpsPerEth: bigint | number | null;
  gnarsUnit: bigint | undefined;
  onOpen: (amount: string) => void;
  isConnected: boolean;
  address: string | undefined;
  isPaused: boolean | null;
  pendingLabel: string | null;
  isConfirmed: boolean;
}

const LOOTBOX_TIERS: { eth: string; label: string; description: string; tier: "bronze" | "silver" | "gold" }[] = [
  { eth: "0.002", label: "Mongo Box", description: "Starter tier", tier: "bronze" },
  { eth: "0.01", label: "Kickfliper Box", description: "Better rewards", tier: "silver" },
  { eth: "0.05", label: "Pro Box", description: "Premium tier", tier: "gold" },
];

export function Experience3DTab({
  flexGnarsBase,
  flexGnarsPerEth,
  flexNftBpsMin,
  flexNftBpsMax,
  flexNftBpsPerEth,
  gnarsUnit,
  onOpen,
  isConnected,
  address,
  isPaused,
  pendingLabel,
  isConfirmed,
}: Experience3DTabProps) {
  // Track which box is currently being opened
  const [activeBoxEth, setActiveBoxEth] = useState<string | null>(null);

  const calculateGnarsReward = (ethAmount: string) => {
    if (!flexGnarsBase || !flexGnarsPerEth || !gnarsUnit) return null;
    const ethValue = parseEther(ethAmount);
    const gnarsReward = flexGnarsBase + (ethValue * flexGnarsPerEth) / parseEther("1");
    return formatGnarsAmount(gnarsReward, gnarsUnit);
  };

  // Calculate NFT chance based on ETH amount and contract parameters
  // Formula: nftBps = min(flexNftBpsMin + (ethAmount * flexNftBpsPerEth / 1e18), flexNftBpsMax)
  // nftChance = nftBps / 100 (basis points to percentage)
  const calculateNftOdds = (ethAmount: string) => {
    if (flexNftBpsMin === null || flexNftBpsMax === null || flexNftBpsPerEth === null) {
      return "...";
    }
    
    const ethValue = parseEther(ethAmount);
    const bpsMin = BigInt(flexNftBpsMin);
    const bpsMax = BigInt(flexNftBpsMax);
    const bpsPerEth = BigInt(flexNftBpsPerEth);
    
    // Calculate: bpsMin + (ethValue * bpsPerEth / 1e18)
    const additionalBps = (ethValue * bpsPerEth) / parseEther("1");
    const totalBps = bpsMin + additionalBps;
    
    // Cap at max
    const finalBps = totalBps > bpsMax ? bpsMax : totalBps;
    
    // Convert basis points to percentage (divide by 100)
    const percentage = Number(finalBps) / 100;
    
    return `${percentage.toFixed(2)}%`;
  };

  const handleBoxOpen = (ethAmount: string) => {
    setActiveBoxEth(ethAmount);
    onOpen(ethAmount);
  };

  // Reset active box when transaction completes
  const isBoxPending = (ethAmount: string) => {
    return activeBoxEth === ethAmount && pendingLabel === "Joining Gnars" && !isConfirmed;
  };

  const isBoxOpening = (ethAmount: string) => {
    return activeBoxEth === ethAmount && pendingLabel === "Joining Gnars" && isConfirmed;
  };

  return (
    <TabsContent value="3d">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LOOTBOX_TIERS.map((tier) => (
          <Card 
            key={tier.eth} 
            className="group bg-card/50 border-border/50 hover:border-primary/40 transition-all duration-200 hover:bg-card overflow-hidden rounded-xl"
          >
            {/* 3D Artwork Area */}
            <div className="aspect-[4/3] w-full bg-gradient-to-b from-secondary/20 to-secondary/5 relative">
              <AnimatedChest3D
                onOpen={() => handleBoxOpen(tier.eth)}
                isPending={isBoxPending(tier.eth)}
                isOpening={isBoxOpening(tier.eth)}
                disabled={!isConnected || isPaused || !address}
                tier={tier.tier}
              />
            </div>
            
            {/* Card Info Footer */}
            <CardContent className="p-4 space-y-3">
              {/* Title & Price Row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-base">{tier.label}</h3>
                  <p className="text-xs text-muted-foreground">{tier.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-base">{tier.eth}</p>
                  <p className="text-xs text-muted-foreground">ETH</p>
                </div>
              </div>
              
              {/* Rewards */}
              <div className="flex items-center justify-between py-2 px-3 bg-secondary/30 rounded-lg text-sm">
                <span className="text-muted-foreground">Minimum reward</span>
                <span className="font-semibold">{calculateGnarsReward(tier.eth) || "..."} GNARS</span>
              </div>
              
              {/* NFT Odds */}
              <div className="flex items-center justify-between py-2 px-3 bg-secondary/30 rounded-lg text-sm">
                <span className="text-muted-foreground">NFT Odds</span>
                <span className="font-semibold text-primary">{calculateNftOdds(tier.eth)}</span>
              </div>
              
              {/* Action Button */}
              <Button 
                className="w-full" 
                onClick={() => handleBoxOpen(tier.eth)}
                disabled={!isConnected || isPaused || !address}
              >
                {!isConnected ? "Connect Wallet" : isPaused ? "Paused" : "Open Box"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </TabsContent>
  );
}