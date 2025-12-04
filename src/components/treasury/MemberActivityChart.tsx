/**
 * MemberActivityChart - Voter participation across recent proposals
 * Shows bar chart of unique voters per proposal (excluding cancelled)
 * Accessibility: Full keyboard navigation, clear labeling for screen readers
 * Performance: Uses React Query with proposal data transformation
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
import { useMemberActivity } from "@/hooks/use-member-activity";

const chartConfig = {
  voters: {
    label: "Voters",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function MemberActivityChart() {
  const { data: proposalBars = [], isLoading, error } = useMemberActivity(12);

  if (error) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Member Activity</CardTitle>
          <CardDescription>Unable to load member activity data</CardDescription>
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
            <CardTitle>Member Activity</CardTitle>
            <CardDescription>Voters per recent proposals (excluding cancelled)</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="h-[200px] w-full space-y-3 p-4">
            <div className="flex justify-between items-end space-x-2">
              <Skeleton className="h-16 w-8" />
              <Skeleton className="h-12 w-8" />
              <Skeleton className="h-20 w-8" />
              <Skeleton className="h-14 w-8" />
              <Skeleton className="h-18 w-8" />
              <Skeleton className="h-10 w-8" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-6" />
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
          <CardTitle>Member Activity</CardTitle>
          <CardDescription>Voters per recent proposals (excluding cancelled)</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-0 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <ChartContainer config={chartConfig} className="h-[200px] w-full max-w-full">
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
        </div>
      </CardContent>
    </Card>
  );
}
