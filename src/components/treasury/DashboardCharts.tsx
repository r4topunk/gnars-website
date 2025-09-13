"use client";

import { useEffect, useMemo, useState } from "react";
import { getProposals } from "@buildeross/sdk";
import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
} from "@/components/ui/chart";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";

type TreasuryPoint = { month: string; eth: number; usdc: number };
const DEFAULT_TREASURY_TREND: TreasuryPoint[] = [
  { month: "M1", eth: 0, usdc: 0 },
  { month: "M2", eth: 0, usdc: 0 },
  { month: "M3", eth: 0, usdc: 0 },
  { month: "M4", eth: 0, usdc: 0 },
  { month: "M5", eth: 0, usdc: 0 },
  { month: "M6", eth: 0, usdc: 0 },
];

// Default/fallback treasury allocation data used before live data loads
const DEFAULT_TREASURY_DATA = [
  { name: "ETH", value: 85.2, color: "#627EEA" },
  { name: "USDC", value: 8.5, color: "#2775CA" },
  { name: "Other", value: 4.1, color: "#F59E0B" },
  { name: "NFTs", value: 2.2, color: "#EF4444" },
];

// removed unused MinimalProposal type

type ProposalWithVotes = {
  proposalNumber: number;
  timeCreated: number;
  voterCount: number;
};

type SdkVote = { voter?: string | null };
type MinimalSdkProposal = {
  votes?: unknown;
  state?: number | string | null;
  cancelTransactionHash?: unknown;
  proposalNumber?: number | string | null;
  timeCreated?: number | string | null;
};

async function fetchRecentProposalsWithVoters(limit: number): Promise<ProposalWithVotes[]> {
  const { proposals } = await getProposals(CHAIN.id, GNARS_ADDRESSES.token, limit);
  const list = (proposals as MinimalSdkProposal[] | undefined) ?? [];
  return list
    .map<ProposalWithVotes & { _isCanceled: boolean }>((p) => {
      const rawVotes = Array.isArray(p.votes) ? p.votes : [];
      const votes: SdkVote[] = rawVotes as SdkVote[];
      const uniqueVoters = new Set<string>();
      for (const vote of votes) {
        const voter = vote?.voter;
        if (voter) uniqueVoters.add(String(voter).toLowerCase());
      }
      const rawState = p.state;
      const hasCancelTx = Boolean(p.cancelTransactionHash);
      const isCanceledByState =
        typeof rawState === "number"
          ? rawState === 2
          : String(rawState ?? "")
              .toUpperCase()
              .includes("CANCEL");
      const isCanceled = hasCancelTx || isCanceledByState;
      return {
        proposalNumber: Number(p.proposalNumber ?? 0),
        timeCreated: Number(p.timeCreated ?? 0),
        voterCount: uniqueVoters.size,
        _isCanceled: isCanceled,
      };
    })
    .filter((row) => !row._isCanceled)
    .sort((a, b) => b.timeCreated - a.timeCreated);
}

const auctionChartConfig = {
  eth: {
    label: "ETH",
    color: "#8FA8F5", // lighter blue 1
  },
  usdc: {
    label: "USDC",
    color: "#5B9BD5", // lighter blue 2
  },
} satisfies ChartConfig;

const treasuryChartConfig = {
  eth: {
    label: "ETH",
    color: "#627EEA",
  },
  usdc: {
    label: "USDC",
    color: "#2775CA",
  },
  other: {
    label: "Other",
    color: "#F59E0B",
  },
  nfts: {
    label: "NFTs",
    color: "#EF4444",
  },
} satisfies ChartConfig;

const memberChartConfig = {
  voters: {
    label: "Voters",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function AuctionTrendChart() {
  const [points, setPoints] = useState<TreasuryPoint[]>(DEFAULT_TREASURY_TREND);
  const [footerNote, setFooterNote] = useState<string>("Including current month");

  useEffect(() => {
    let active = true;
    const url = `/api/treasury/performance?months=6&address=${GNARS_ADDRESSES.treasury}`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("api error"))))
      .then((data: { points?: Array<{ month?: string; eth?: number; usdc?: number }> }) => {
        if (!active) return;
        const rows = Array.isArray(data?.points) ? data.points : [];
        if (!rows.length) return;
        const next: TreasuryPoint[] = rows.map((r) => {
          const raw = String(r.month ?? "");
          let label = raw;
          try {
            const [yy, mm] = raw.split("-").map((n) => parseInt(n, 10));
            if (Number.isFinite(yy) && Number.isFinite(mm)) {
              const d = new Date(Date.UTC(yy, (mm || 1) - 1, 1));
              label = d.toLocaleString("en-US", { month: "short" });
            }
          } catch {}
          const ethVal = Number(r.eth ?? 0) || 0;
          const usdcThousands = (Number(r.usdc ?? 0) || 0) / 1000; // normalize to K for visibility
          return {
            month: label,
            eth: ethVal,
            usdc: usdcThousands,
          };
        });
        setPoints(next);
        setFooterNote(`Last ${next.length} months (incl. current)`);
      })
      .catch(() => {
        // keep defaults
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Treasury Performance</CardTitle>
          <CardDescription>ETH and USDC balances over the last 6 months</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={auctionChartConfig} className="h-[200px] w-full">
          <AreaChart
            accessibilityLayer
            data={points}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => String(v).slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name) => {
                    const v = Number(value ?? 0);
                    const label = String(name ?? "");
                    const isUsdc = label.toUpperCase().includes("USDC");
                    const formatted = isUsdc ? `${Math.round(v)}k` : v.toFixed(4);
                    return (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-medium">{formatted}</span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Area
              dataKey="usdc"
              name="USDC (k)"
              type="natural"
              fill="var(--color-usdc)"
              fillOpacity={0.4}
              stroke="var(--color-usdc)"
            />
            <Area
              dataKey="eth"
              name="ETH"
              type="natural"
              fill="var(--color-eth)"
              fillOpacity={0.4}
              stroke="var(--color-eth)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-center justify-center gap-2 text-sm">
          <div className="grid gap-2 text-center">
            <div className="flex items-center justify-center gap-2 font-medium leading-none">
              {footerNote} <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-center gap-2 leading-none text-muted-foreground">
              Source: Base RPC & BaseScan
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export function TreasuryAllocationChart() {
  const [chartData, setChartData] = useState(
    DEFAULT_TREASURY_DATA as { name: string; value: number; color: string }[],
  );
  const [footerBreakdown, setFooterBreakdown] = useState<string>("");
  const [totalValueUsd, setTotalValueUsd] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAllocation() {
      try {
        const apiUrl = `https://pioneers.dev/api/v1/portfolio/${GNARS_ADDRESSES.treasury}`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("portfolio api error");
        const data = await res.json();

        // Tokens array lives at data.tokens[treasury]
        const tokens: Array<{
          token?: {
            name?: string;
            symbol?: string;
            balanceUSD?: number;
          };
        }> = (data?.tokens?.[GNARS_ADDRESSES.treasury] as unknown) as Array<{
          token?: { name?: string; symbol?: string; balanceUSD?: number };
        }>;

        const nftNetWorth: number = Number(data?.nftNetWorth?.[GNARS_ADDRESSES.treasury] ?? 0) || 0;

        let ethUsd = 0;
        let usdcUsd = 0;
        let otherUsd = 0;

        if (Array.isArray(tokens)) {
          for (const entry of tokens) {
            const name = (entry?.token?.name || "").toString();
            const symbol = (entry?.token?.symbol || "").toString();
            const valueUsd = Number(entry?.token?.balanceUSD || 0) || 0;
            if (!valueUsd) continue;
            if (name === "Ethereum" || symbol.toUpperCase() === "ETH") {
              ethUsd += valueUsd;
            } else if (name === "USD Coin" || symbol.toUpperCase() === "USDC") {
              usdcUsd += valueUsd;
            } else {
              otherUsd += valueUsd;
            }
          }
        }

        const totalUsd = ethUsd + usdcUsd + otherUsd + nftNetWorth; // include NFTs in pie
        if (totalUsd <= 0) return;

        const pct = (x: number) => Math.round((x / totalUsd) * 1000) / 10; // one decimal

        const nextData = [
          { name: "ETH", value: pct(ethUsd), color: "#627EEA" },
          { name: "USDC", value: pct(usdcUsd), color: "#2775CA" },
          { name: "Other", value: pct(otherUsd), color: "#F59E0B" },
          { name: "NFTs", value: pct(nftNetWorth), color: "#EF4444" },
        ];

        if (!active) return;
        setChartData(nextData);
        setTotalValueUsd(totalUsd);
        const toK = (n: number) => `$${(Math.round((n / 1000) * 10) / 10).toFixed(1)}k`;
        setFooterBreakdown(
          `${toK(ethUsd)} ETH, ${toK(usdcUsd)} USDC, ${toK(otherUsd + nftNetWorth)} Others`,
        );
      } catch {
        // keep defaults
      }
    }

    loadAllocation();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Treasury Allocation</CardTitle>
          <CardDescription>Current asset distribution in the DAO treasury</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={treasuryChartConfig} className="h-[200px] w-full">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(
                    value: number | string | (number | string)[],
                    name: string | number,
                  ) => {
                    const percentNumber = Array.isArray(value)
                      ? Number(value[0] ?? 0)
                      : Number(value ?? 0);
                    const label = String(name ?? "");
                    return (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-medium">{percentNumber.toFixed(1)}%</span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              nameKey="name"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartLegend
              verticalAlign="bottom"
              content={(props) => {
                const rawPayload = (props as { payload?: unknown }).payload;
                const payload = Array.isArray(rawPayload) ? (rawPayload as unknown[]) : [];
                return (
                  <div className="flex items-center justify-center gap-4 pt-3 text-xs">
                    {payload.map((raw) => {
                      const item = raw as {
                        value?: string | number;
                        color?: string;
                        payload?: { name?: string } | undefined;
                      };
                      const segName = String(item?.value ?? item?.payload?.name ?? "");
                      const color = item?.color;
                      return (
                        <div key={segName} className="flex items-center gap-1.5">
                          <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
                          <span>{segName}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-center justify-center gap-2 text-sm">
          <div className="grid gap-2 text-center">
            {footerBreakdown ? (
              <div className="flex items-center justify-center gap-2 font-medium leading-none">{footerBreakdown}</div>
            ) : null}
            <div className="flex items-center justify-center gap-2 leading-none text-muted-foreground">
              {totalValueUsd === null
                ? "Live data unobtainable, showing defaults"
                : `Total: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                    totalValueUsd,
                  )}`}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export function MemberActivityChart() {
  const [proposalBars, setProposalBars] = useState<
    { proposal: string; proposalNumber: number; voters: number }[]
  >([]);
  const totalVoters = useMemo(
    () => proposalBars.reduce((sum, r) => sum + r.voters, 0),
    [proposalBars],
  );

  useEffect(() => {
    let active = true;
    fetchRecentProposalsWithVoters(12)
      .then((rows) => {
        if (!active) return;
        setProposalBars(
          rows
            .slice(0, 6)
            .reverse() // oldest to newest for nicer left-to-right feel
            .map((r) => ({
              proposal: `Prop #${r.proposalNumber}`,
              proposalNumber: r.proposalNumber,
              voters: r.voterCount,
            })),
        );
      })
      .catch(() => {
        if (!active) return;
        setProposalBars([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Member Activity</CardTitle>
          <CardDescription>Voters per recent proposals (excluding cancelled)</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={memberChartConfig} className="h-[200px] w-full">
          <BarChart
            accessibilityLayer
            data={proposalBars}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="proposalNumber" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="voters" fill="var(--color-voters)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-center justify-center gap-2 text-sm">
          <div className="grid gap-2 text-center">
            <div className="flex items-center justify-center gap-2 font-medium leading-none">
              {totalVoters} voters across recent proposals <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-center gap-2 leading-none text-muted-foreground">
              Showing {proposalBars.length} proposals
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
