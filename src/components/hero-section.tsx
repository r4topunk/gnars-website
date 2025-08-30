"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Zap, Users, Trophy, TrendingUp } from "lucide-react";
import { DAO_DESCRIPTION } from "@/lib/config";

interface HeroSectionProps {
  currentAuction: {
    id: string;
    tokenId: string;
    highestBid: string;
    bidder: string;
    endTime: Date;
    settled: boolean;
  };
  stats: {
    totalSupply: number;
    members: number;
    treasuryValue?: string;
  };
}

export function HeroSection({ currentAuction, stats }: HeroSectionProps) {
  // Calculate time remaining for auction
  const now = new Date();
  const endTime = new Date(currentAuction.endTime);
  const timeRemaining = Math.max(0, endTime.getTime() - now.getTime());
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  // Calculate auction progress (mock - based on time elapsed)
  const auctionDuration = 24 * 60 * 60 * 1000; // 24 hours in ms
  const elapsed = auctionDuration - timeRemaining;
  const progressPercentage = Math.min(100, Math.max(0, (elapsed / auctionDuration) * 100));

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-muted/50 via-background to-muted/30">
      {/* Hero Content */}
      <div className="relative z-10 px-4 py-12 md:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          {/* Main Hero */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left Column - Brand & CTA */}
            <div className="flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <Badge 
                  variant="secondary" 
                  className="w-fit"
                >
                  <Zap className="mr-1 h-3 w-3" />
                  Action Sports DAO
                </Badge>
                
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                  <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Gnars DAO
                  </span>
                </h1>
                
                <p className="text-lg text-muted-foreground md:text-xl">
                  {DAO_DESCRIPTION}
                </p>
                
                <div className="text-sm text-muted-foreground">
                  Headless so you can <strong className="text-foreground">shred more</strong>…
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" className="touch-manipulation">
                  <Trophy className="mr-2 h-4 w-4" />
                  Join Auction
                </Button>
                <Button size="lg" variant="outline" className="touch-manipulation">
                  <Users className="mr-2 h-4 w-4" />
                  Connect Wallet
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold">{stats.totalSupply}</div>
                    <div className="text-xs text-muted-foreground">Total NFTs</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold">{stats.members}</div>
                    <div className="text-xs text-muted-foreground">Members</div>
                  </div>
                </div>
                {stats.treasuryValue && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-semibold">{stats.treasuryValue} ETH</div>
                      <div className="text-xs text-muted-foreground">Treasury</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Current Auction Spotlight */}
            <div className="flex items-center justify-center">
              <Card className="w-full max-w-md border-2 bg-card shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        Live Auction
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {hoursRemaining}h {minutesRemaining}m left
                      </div>
                    </div>

                    {/* Mock NFT Preview */}
                    <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">
                          Gnar #{currentAuction.tokenId}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Action Sports NFT
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {currentAuction.highestBid} ETH
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Current Highest Bid
                        </div>
                      </div>

                      <Progress value={progressPercentage} className="h-2" />

                      <Button className="w-full touch-manipulation min-h-[44px]">
                        Place Bid
                      </Button>

                      <div className="text-center text-xs text-muted-foreground">
                        Leading bidder: {currentAuction.bidder.slice(0, 6)}...{currentAuction.bidder.slice(-4)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 h-96 w-96 rounded-full bg-muted/20 blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/2 h-96 w-96 rounded-full bg-muted/10 blur-3xl"></div>
      </div>
    </section>
  );
}