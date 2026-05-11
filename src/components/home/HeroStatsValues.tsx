import { getTranslations } from "next-intl/server";
import { TrendingUp, Trophy, Users } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { DAO_ADDRESSES } from "@/lib/config";
import { fetchDaoStats } from "@/services/dao";
import { loadTreasurySnapshot } from "@/services/treasury";

function formatLargeNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return value.toFixed(0);
}

export async function HeroStatsValues() {
  const t = await getTranslations("home.hero.stats");

  const [daoStats, snapshot] = await Promise.all([
    fetchDaoStats().catch(() => ({ totalSupply: 0, ownerCount: 0 })),
    loadTreasurySnapshot(DAO_ADDRESSES.treasury).catch(() => ({
      usdTotal: 0,
      ethBalance: 0,
      totalAuctionSales: 0,
    })),
  ]);

  const formattedTreasury = formatLargeNumber(snapshot.usdTotal);

  return (
    <div className="flex flex-wrap gap-4 pt-4">
      <div className="flex items-center gap-2 text-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
          <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <div className="font-semibold">
            <CountUp value={daoStats.totalSupply} durationMs={800} />
          </div>
          <div className="text-xs text-muted-foreground">{t("totalGnars")}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <div className="font-semibold">
            <CountUp value={daoStats.ownerCount} durationMs={800} />
          </div>
          <div className="text-xs text-muted-foreground">{t("members")}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <div className="font-semibold">${formattedTreasury}</div>
          <div className="text-xs text-muted-foreground">{t("treasury")}</div>
        </div>
      </div>
    </div>
  );
}
