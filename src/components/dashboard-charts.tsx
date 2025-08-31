"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

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
} from "@/components/ui/chart";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { getProposals } from "@buildeross/sdk";

// Mock data for auction trends (last 30 days)
const auctionTrendData = [
  { day: "Day 1", finalPrice: 1.2, bids: 8 },
  { day: "Day 2", finalPrice: 1.5, bids: 12 },
  { day: "Day 3", finalPrice: 2.1, bids: 15 },
  { day: "Day 4", finalPrice: 1.8, bids: 10 },
  { day: "Day 5", finalPrice: 2.3, bids: 18 },
  { day: "Day 6", finalPrice: 1.9, bids: 14 },
  { day: "Day 7", finalPrice: 2.7, bids: 22 },
  { day: "Day 8", finalPrice: 2.1, bids: 16 },
  { day: "Day 9", finalPrice: 2.4, bids: 19 },
  { day: "Day 10", finalPrice: 1.6, bids: 11 },
  { day: "Day 11", finalPrice: 3.1, bids: 25 },
  { day: "Day 12", finalPrice: 2.8, bids: 21 },
  { day: "Day 13", finalPrice: 2.2, bids: 17 },
  { day: "Day 14", finalPrice: 2.6, bids: 20 },
];

// Mock treasury allocation data
const treasuryData = [
  { name: "ETH", value: 85.2, color: "#627EEA" },
  { name: "USDC", value: 8.5, color: "#2775CA" },
  { name: "Other Tokens", value: 4.1, color: "#F59E0B" },
  { name: "NFTs", value: 2.2, color: "#EF4444" },
];

type MinimalProposal = {
  proposalNumber: number
  forVotes?: string | number
  againstVotes?: string | number
  abstainVotes?: string | number
  timeCreated?: number | string
}

async function fetchRecentProposalVotes(limit: number) {
  const { proposals } = await getProposals(CHAIN.id, GNARS_ADDRESSES.token, limit)
  const list = (proposals as MinimalProposal[] | undefined) ?? []
  return list
    .map((p) => {
      const forVotes = Number(p.forVotes ?? 0)
      const againstVotes = Number(p.againstVotes ?? 0)
      const abstainVotes = Number(p.abstainVotes ?? 0)
      const totalVotes = forVotes + againstVotes + abstainVotes
      const timeCreated = Number(p.timeCreated ?? 0)
      return {
        proposalNumber: Number(p.proposalNumber),
        totalVotes,
        timeCreated,
      }
    })
    .sort((a, b) => b.timeCreated - a.timeCreated)
}

type ProposalWithVotes = {
  proposalNumber: number
  timeCreated: number
  voterCount: number
}

async function fetchRecentProposalsWithVoters(limit: number): Promise<ProposalWithVotes[]> {
  const { proposals } = await getProposals(CHAIN.id, GNARS_ADDRESSES.token, limit)
  const list = ((proposals as unknown) as Array<Record<string, unknown>>) ?? []
  return list
    .map((p) => {
      const votes = Array.isArray((p as any)?.votes) ? ((p as any).votes as Array<{ voter?: string | null }>) : []
      const uniqueVoters = new Set<string>()
      for (const v of votes) {
        if (v?.voter) uniqueVoters.add(String(v.voter).toLowerCase())
      }
      const rawState = (p as any)?.state
      const hasCancelTx = Boolean((p as any)?.cancelTransactionHash)
      const isCanceledByState = typeof rawState === 'number' ? rawState === 2 : String(rawState ?? '').toUpperCase().includes('CANCEL')
      const isCanceled = hasCancelTx || isCanceledByState
      return {
        proposalNumber: Number((p as any)?.proposalNumber ?? 0),
        timeCreated: Number((p as any)?.timeCreated ?? 0),
        voterCount: uniqueVoters.size,
        _isCanceled: isCanceled,
      } as unknown as ProposalWithVotes & { _isCanceled: boolean }
    })
    .filter((p: any) => !p._isCanceled)
    .sort((a, b) => b.timeCreated - a.timeCreated)
}

const auctionChartConfig = {
  finalPrice: {
    label: "Final Price (ETH)",
    color: "var(--chart-4)",
  },
  bids: {
    label: "Total Bids",
    color: "var(--chart-3)",
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
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Auction Performance</CardTitle>
          <CardDescription>
            Final prices and bid activity over the last 14 days
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={auctionChartConfig} className="h-[200px] w-full">
          <AreaChart
            accessibilityLayer
            data={auctionTrendData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(-1)} // Show only day number
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillFinalPrice" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-finalPrice)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-finalPrice)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="finalPrice"
              type="natural"
              fill="url(#fillFinalPrice)"
              fillOpacity={0.4}
              stroke="var(--color-finalPrice)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              Average final price up 12% this week <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              Last 14 auctions completed
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export function TreasuryAllocationChart() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Treasury Allocation</CardTitle>
          <CardDescription>
            Current asset distribution in the DAO treasury
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={treasuryChartConfig} className="h-[200px] w-full">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={treasuryData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {treasuryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              85.2% ETH, 8.5% USDC, 6.3% Others
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              Total treasury value: ~247.3 ETH
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export function MemberActivityChart() {
  const [proposalBars, setProposalBars] = useState<{ proposal: string; voters: number }[]>([])
  const totalVoters = useMemo(() => proposalBars.reduce((sum, r) => sum + r.voters, 0), [proposalBars])

  useEffect(() => {
    let active = true
    fetchRecentProposalsWithVoters(12)
      .then((rows) => {
        if (!active) return
        setProposalBars(
          rows
            .slice(0, 6)
            .reverse() // oldest to newest for nicer left-to-right feel
            .map((r) => ({ proposal: `Prop #${r.proposalNumber}`, voters: r.voterCount }))
        )
      })
      .catch(() => {
        if (!active) return
        setProposalBars([])
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Member Activity</CardTitle>
          <CardDescription>
            Voters per recent proposals (excluding cancelled)
          </CardDescription>
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
            <XAxis
              dataKey="proposal"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="voters" fill="var(--color-voters)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              {totalVoters} voters across recent proposals <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              Showing {proposalBars.length} proposals
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}