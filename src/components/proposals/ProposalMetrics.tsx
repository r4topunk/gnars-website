"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProposalStatus } from "@/lib/schemas/proposals";

interface ProposalMetricsProps {
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorumVotes: string;
  snapshotBlock?: number;
  status?: ProposalStatus;
  startDate?: Date;
  endDate?: Date;
}

export function ProposalMetrics({
  forVotes,
  againstVotes,
  abstainVotes,
  quorumVotes,
  snapshotBlock,
  status,
  startDate,
  endDate,
}: ProposalMetricsProps) {
  const t = useTranslations("proposals");
  const formatVotes = (votes: string) => {
    const num = parseFloat(votes);
    return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const parseVotes = (votes: string) => {
    const num = Number.parseFloat(votes);
    return Number.isFinite(num) ? Math.max(num, 0) : 0;
  };

  const formatBlock = (block: number) => {
    return block.toLocaleString();
  };

  const forNum = parseVotes(forVotes);
  const againstNum = parseVotes(againstVotes);
  const abstainNum = parseVotes(abstainVotes);
  const totalVotes = Math.max(forNum + againstNum + abstainNum, 0.000001);
  const forPct = Math.min(100, Math.max(0, (forNum / totalVotes) * 100));
  const againstPct = Math.min(100, Math.max(0, (againstNum / totalVotes) * 100));
  const abstainPct = Math.min(100, Math.max(0, (abstainNum / totalVotes) * 100));

  const isPending = status === ProposalStatus.PENDING;
  const dateToShow = isPending ? (startDate ?? endDate) : endDate;
  // Intentional render-time read: the label reflects current clock on each render.
  // Hydration mismatch is suppressed on the consuming nodes below.
  // eslint-disable-next-line react-hooks/purity
  const renderNow = Date.now();

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
      {/* Mobile: For | Against, Desktop: For | Against | Abstain */}
      <Card className="py-2 gap-0 md:gap-2">
        <CardHeader className="pb-1 px-4">
          <CardTitle className="text-md font-semibold text-foreground/90">
            {t("metrics.for")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 py-1 px-4">
          <div className="text-xl md:text-2xl font-bold text-green-600">
            {formatVotes(forVotes)}
          </div>
          <Progress value={forPct} className="h-1.5" indicatorClassName="bg-green-500" />
        </CardContent>
      </Card>

      <Card className="py-2 gap-0 md:gap-2">
        <CardHeader className="pb-1 px-4">
          <CardTitle className="text-md font-semibold text-foreground/90">
            {t("metrics.against")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 py-1 px-4">
          <div className="text-xl md:text-2xl font-bold text-red-600">
            {formatVotes(againstVotes)}
          </div>
          <Progress value={againstPct} className="h-1.5" indicatorClassName="bg-red-500" />
        </CardContent>
      </Card>

      {/* Mobile: Abstain | Threshold, Desktop: Threshold | Ends | Snapshot */}
      <Card className="py-2 gap-0 md:gap-2">
        <CardHeader className="pb-1 px-4">
          <CardTitle className="text-md font-semibold text-foreground/90">
            {t("metrics.abstain")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 py-1 px-4">
          <div className="text-xl md:text-2xl font-bold text-muted-foreground">
            {formatVotes(abstainVotes)}
          </div>
          <Progress
            value={abstainPct}
            className="h-1.5"
            indicatorClassName="bg-muted-foreground/40"
          />
        </CardContent>
      </Card>

      <Card className="py-2 gap-0 md:gap-2">
        <CardHeader className="pb-1 px-4">
          <CardTitle className="text-md font-semibold text-foreground/90">
            {t("metrics.threshold")}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-1 px-4">
          <div className="text-xl md:text-2xl font-bold">
            {t("metrics.votes", { count: formatVotes(quorumVotes) })}
          </div>
          <div className="text-xs text-muted-foreground">{t("metrics.currentThreshold")}</div>
        </CardContent>
      </Card>

      {/* Mobile: Ends | Snapshot */}
      {dateToShow && (
        <Card className="py-2 gap-0 md:gap-2">
          <CardHeader className="pb-1 px-4">
            <CardTitle className="text-md font-semibold text-foreground/90">
              {isPending
                ? t("metrics.starts")
                : forNum + againstNum + abstainNum > 0 && dateToShow.getTime() < renderNow
                  ? t("metrics.ended")
                  : t("metrics.ends")}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1 px-4" suppressHydrationWarning>
            <div className="text-xl md:text-2xl font-semibold" suppressHydrationWarning>
              {dateToShow.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="text-xs text-muted-foreground" suppressHydrationWarning>
              {dateToShow.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZoneName: "short",
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {snapshotBlock && (
        <Card className="py-2 gap-0 md:gap-2">
          <CardHeader className="pb-1 px-4">
            <CardTitle className="text-md font-semibold text-foreground/90">
              {t("metrics.snapshot")}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1 px-4">
            <div className="text-xl md:text-2xl font-semibold">#{formatBlock(snapshotBlock)}</div>
            <div className="text-xs text-muted-foreground">{t("metrics.takenAtBlock")}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
