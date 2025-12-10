import { formatEther } from "viem";
import { TrendingUp, Trophy, Users } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { fetchDaoStats } from "@/services/dao";
import { GNARS_ADDRESSES } from "@/lib/config";

async function getTreasuryBalance(): Promise<string> {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [GNARS_ADDRESSES.treasury, "latest"],
        id: 1,
      }),
      next: { revalidate: 60 },
    });

    if (!response.ok) return "0";

    const data = await response.json();
    const hex = typeof data?.result === "string" ? data.result : "0x0";
    const wei = BigInt(hex);
    const ethStr = formatEther(wei);
    const eth = parseFloat(ethStr);
    return Number.isFinite(eth) ? eth.toFixed(1) : "0";
  } catch {
    return "0";
  }
}

export async function HeroStatsValues() {
  const [daoStats, treasuryEth] = await Promise.all([
    fetchDaoStats().catch(() => ({ totalSupply: 0, ownerCount: 0 })),
    getTreasuryBalance(),
  ]);

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
          <div className="text-xs text-muted-foreground">Total NFTs</div>
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
          <div className="text-xs text-muted-foreground">Members</div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <div className="font-semibold">
            <CountUp value={parseFloat(treasuryEth)} decimals={1} durationMs={900} /> ETH
          </div>
          <div className="text-xs text-muted-foreground">Treasury</div>
        </div>
      </div>
    </div>
  );
}
