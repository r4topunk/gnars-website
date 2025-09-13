/**
 * AuctionTrendChart - Treasury performance over time
 * Shows ETH and USDC balances across the last 6 months using area chart
 * Accessibility: Full keyboard navigation, screen reader support via recharts
 * Performance: Uses React Query for caching and background updates
 */

"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useTreasuryPerformance } from "@/hooks/use-treasury-performance";

const chartConfig = {
  eth: {
    label: "ETH",
    color: "#8FA8F5", // lighter blue 1
  },
  usdc: {
    label: "USDC",
    color: "#5B9BD5", // lighter blue 2
  },
} satisfies ChartConfig;

export function AuctionTrendChart() {
  const { data: points = [], isLoading, error } = useTreasuryPerformance(6);

  const footerNote = `Last ${points.length} months (incl. current)`;

  if (error) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Treasury Performance</CardTitle>
          <CardDescription>Unable to load treasury data</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            Failed to load data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Treasury Performance</CardTitle>
            <CardDescription>ETH and USDC balances over the last 6 months</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="h-[200px] w-full space-y-3 p-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-[140px] w-full" />
            <div className="flex justify-center space-x-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-center justify-center gap-2 text-sm">
            <div className="grid gap-2 text-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Treasury Performance</CardTitle>
          <CardDescription>ETH and USDC balances over the last 6 months</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
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
              {isLoading ? "Loading..." : footerNote} <TrendingUp className="h-4 w-4" />
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
