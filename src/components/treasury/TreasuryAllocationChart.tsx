/**
 * TreasuryAllocationChart - Current asset distribution pie chart
 * Shows ETH, USDC, Other tokens, and NFTs as percentage breakdown
 * Accessibility: Full keyboard navigation, custom legend with color indicators
 * Performance: Uses React Query with 10min cache for portfolio data
 */

"use client";

import { TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useTreasuryAllocation } from "@/hooks/use-treasury-allocation";

const chartConfig = {
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

export function TreasuryAllocationChart() {
  const { data, isLoading, error } = useTreasuryAllocation();

  if (error) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Treasury Allocation</CardTitle>
          <CardDescription>Unable to load allocation data</CardDescription>
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
            <CardTitle>Treasury Allocation</CardTitle>
            <CardDescription>Current asset distribution in the DAO treasury</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="h-[200px] w-full flex items-center justify-center">
            <div className="space-y-4">
              <Skeleton className="h-32 w-32 rounded-full mx-auto" />
              <div className="flex justify-center space-x-4">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-9" />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-center justify-center gap-2 text-sm">
            <div className="grid gap-2 text-center">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </CardFooter>
      </Card>
    );
  }

  const { allocation = [], totalValueUsd } = data ?? {};

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Treasury Allocation</CardTitle>
          <CardDescription>Current asset distribution in the DAO treasury</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
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
              data={allocation}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              nameKey="name"
              dataKey="value"
            >
              {allocation.map((entry, index) => (
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
            <div className="flex items-center justify-center gap-2 font-medium leading-none">
              {isLoading ? "Loading..." : "Current allocation snapshot"} <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center justify-center gap-2 leading-none text-muted-foreground">
              {totalValueUsd === null
                ? "Live data unavailable, showing defaults"
                : `Total: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                    totalValueUsd ?? 0,
                  )}`}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
