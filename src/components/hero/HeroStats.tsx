"use client";

import { TrendingUp, Trophy, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CountUp } from "@/components/ui/count-up";
import { DAO_DESCRIPTION } from "@/lib/config";

export interface HeroStatsProps {
  stats: {
    totalSupply: number;
    members: number;
    treasuryValue?: string;
  };
}

export function HeroStats({ stats }: HeroStatsProps) {
  return (
    <div className="flex flex-col justify-center space-y-6">
      <div className="space-y-4">
        <Badge
          variant="secondary"
          className="w-fit bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
        >
          <Zap className="mr-1 h-3 w-3" />
          Action Sports DAO
        </Badge>

        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            Gnars DAO
          </span>
        </h1>

        <p className="text-lg text-muted-foreground md:text-xl">{DAO_DESCRIPTION}</p>
      </div>

      {/* Quick Stats */}
      <div className="flex flex-wrap gap-4 pt-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
            <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="font-semibold">
              <CountUp value={Number(stats.totalSupply || 0)} durationMs={800} />
            </div>
            <div className="text-xs text-muted-foreground">Total NFTs</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-semibold">
              <CountUp value={Number(stats.members || 0)} durationMs={800} />
            </div>
            <div className="text-xs text-muted-foreground">Members</div>
          </div>
        </div>
        {stats.treasuryValue && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="font-semibold">
                <CountUp value={parseFloat(stats.treasuryValue || "0")} decimals={1} durationMs={900} /> ETH
              </div>
              <div className="text-xs text-muted-foreground">Treasury</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


