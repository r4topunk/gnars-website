import { TrendingUp, Trophy, Users } from "lucide-react";
import { formatEther } from "viem";
import { CountUp } from "@/components/ui/count-up";
import { GNARS_ADDRESSES, TREASURY_TOKEN_ADDRESSES, TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";
import { fetchDaoStats } from "@/services/dao";

interface TokenBalance {
  contractAddress?: string;
  tokenBalance: string;
  decimals?: number;
}

async function getTreasuryValue(): Promise<number> {
  try {
    const baseUrl = "https://gnars.com";

    const [ethRes, tokenRes, priceRes, ethPriceRes] = await Promise.all([
      fetch(`${baseUrl}/api/alchemy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "eth_getBalance",
          params: [GNARS_ADDRESSES.treasury, "latest"],
        }),
        next: { revalidate: 60 },
      }).then((r) => r.json()),
      fetch(`${baseUrl}/api/alchemy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "alchemy_getTokenBalances",
          params: [GNARS_ADDRESSES.treasury, TREASURY_TOKEN_ADDRESSES.filter(Boolean)],
        }),
        next: { revalidate: 60 },
      }).then((r) => r.json()),
      fetch(`${baseUrl}/api/prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addresses: TREASURY_TOKEN_ADDRESSES.map((a) => String(a).toLowerCase()),
        }),
        next: { revalidate: 60 },
      })
        .then((r) => r.json())
        .catch(() => ({ prices: {} })),
      fetch(`${baseUrl}/api/eth-price`, {
        method: "GET",
        next: { revalidate: 60 },
      })
        .then((r) => r.json())
        .catch(() => ({ usd: 0 })),
    ]);

    const ethBalanceWei = BigInt(ethRes.result ?? "0x0");
    const ethBalance = Number(formatEther(ethBalanceWei));
    const ethPrice = ethPriceRes?.usd ?? 0;

    const tokenBalances = ((tokenRes.result?.tokenBalances ?? []) as TokenBalance[]).filter(
      (token) => {
        const balance = token.tokenBalance?.toLowerCase();
        return balance && balance !== "0" && balance !== "0x0";
      },
    );

    const prices: Record<string, { usd: number }> = priceRes.prices ?? {};
    const wethAddress = String(TREASURY_TOKEN_ALLOWLIST.WETH).toLowerCase();

    const priceLookup = Object.fromEntries(
      Object.entries(prices).map(([address, value]) => [
        address.toLowerCase(),
        address.toLowerCase() === wethAddress ? ethPrice : Number(value?.usd ?? 0) || 0,
      ]),
    );
    priceLookup[wethAddress] = ethPrice;

    const DECIMALS: Record<string, number> = {
      [String(TREASURY_TOKEN_ALLOWLIST.USDC).toLowerCase()]: 6,
      [String(TREASURY_TOKEN_ALLOWLIST.WETH).toLowerCase()]: 18,
      [String(TREASURY_TOKEN_ALLOWLIST.SENDIT).toLowerCase()]: 18,
    };

    const tokensUsd = tokenBalances.reduce((sum, token) => {
      const address = token.contractAddress ? String(token.contractAddress).toLowerCase() : null;
      if (!address) return sum;
      const decimals = DECIMALS[address] ?? 18;
      const raw = token.tokenBalance ?? "0x0";
      const parsed = Number.parseInt(raw, 16);
      const balance = Number.isFinite(parsed) ? parsed / Math.pow(10, decimals) : 0;
      const price = priceLookup[address] ?? 0;
      return sum + balance * price;
    }, 0);

    const nativeEthUsd = ethBalance * ethPrice;
    const usdTotal = tokensUsd + nativeEthUsd;

    return usdTotal;
  } catch {
    return 0;
  }
}

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
  const [daoStats, treasuryValue] = await Promise.all([
    fetchDaoStats().catch(() => ({ totalSupply: 0, ownerCount: 0 })),
    getTreasuryValue(),
  ]);

  const formattedTreasury = formatLargeNumber(treasuryValue);

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
          <div className="text-xs text-muted-foreground">Total Gnars</div>
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
          <div className="font-semibold">${formattedTreasury}</div>
          <div className="text-xs text-muted-foreground">Treasury</div>
        </div>
      </div>
    </div>
  );
}
