/**
 * AuctionBidsPerMonthChart - Auction bid revenue over time
 * Shows total ETH bid value per month for the last 12 months using bar chart
 * Accessibility: Full keyboard navigation, screen reader support via recharts
 * Performance: Uses React Query for caching and background updates
 */

"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
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
import { useAuctionBidsPerMonth } from "@/hooks/use-auction-bids-per-month";

const chartConfig = {
  value: {
    label: "ETH",
    color: "var(--chart-4)", // Yellow - consistent with other charts
  },
} satisfies ChartConfig;

export function AuctionBidsPerMonthChart() {
  const { data: points = [], isLoading, error } = useAuctionBidsPerMonth(12);

  if (error) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Auction Revenue</CardTitle>
          <CardDescription>Unable to load auction data</CardDescription>
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
            <CardTitle>Auction Revenue</CardTitle>
            <CardDescription>ETH earned from auctions per month</CardDescription>
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
      </Card>
    );
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Auction Revenue</CardTitle>
          <CardDescription>ETH earned from auctions per month</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-0 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <ChartContainer config={chartConfig} className="h-[200px] w-full max-w-full">
            <BarChart accessibilityLayer data={points} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => String(v).split(" ")[0]}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value, name) => {
                      const numValue = Number(value);
                      return (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-mono font-medium">{numValue.toFixed(3)} ETH</span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar
                dataKey="value"
                name="ETH"
                fill="var(--color-value)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
