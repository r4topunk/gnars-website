"use client";

import { TrendingUp, Wallet, Gavel, Users } from "lucide-react";
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

// Mock member activity data
const memberActivityData = [
  { month: "Jan", newMembers: 12, totalVotes: 45 },
  { month: "Feb", newMembers: 19, totalVotes: 52 },
  { month: "Mar", newMembers: 15, totalVotes: 38 },
  { month: "Apr", newMembers: 23, totalVotes: 61 },
  { month: "May", newMembers: 18, totalVotes: 47 },
  { month: "Jun", newMembers: 21, totalVotes: 55 },
];

const auctionChartConfig = {
  finalPrice: {
    label: "Final Price (ETH)",
    color: "hsl(var(--chart-1))",
  },
  bids: {
    label: "Total Bids",
    color: "hsl(var(--chart-2))",
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
  newMembers: {
    label: "New Members",
    color: "hsl(var(--chart-1))",
  },
  totalVotes: {
    label: "Total Votes",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function AuctionTrendChart() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Auction Performance</CardTitle>
          <CardDescription>
            Final prices and bid activity over the last 14 days
          </CardDescription>
        </div>
        <Gavel className="h-4 w-4 text-muted-foreground" />
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
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Treasury Allocation</CardTitle>
          <CardDescription>
            Current asset distribution in the DAO treasury
          </CardDescription>
        </div>
        <Wallet className="h-4 w-4 text-muted-foreground" />
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
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Member Activity</CardTitle>
          <CardDescription>
            New member growth and governance participation
          </CardDescription>
        </div>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={memberChartConfig} className="h-[200px] w-full">
          <BarChart
            accessibilityLayer
            data={memberActivityData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="newMembers" fill="var(--color-newMembers)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              21 new members joined this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              342 total members, 55 votes cast
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}