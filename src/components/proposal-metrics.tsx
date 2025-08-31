import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProposalMetricsProps {
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorumVotes: string;
  snapshotBlock?: number;
  endDate?: Date;
  proposer?: string;
  proposerEnsName?: string;
}

export function ProposalMetrics({
  forVotes,
  againstVotes,
  abstainVotes,
  quorumVotes,
  snapshotBlock,
  endDate,
  proposer,
  proposerEnsName,
}: ProposalMetricsProps) {
  const formatVotes = (votes: string) => {
    const num = parseFloat(votes);
    return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const parseVotes = (votes: string) => {
    const num = Number.parseFloat(votes);
    return Number.isFinite(num) ? Math.max(num, 0) : 0;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  return (
    <div className="space-y-3">
      {/* Top row: For / Against / Abstain */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        {/* For */}
        <Card className="py-2 gap-3">
          <CardHeader className="pb-1 px-4">
            <CardTitle className="text-md font-semibold text-foreground/90">For</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 py-1 px-4">
            <div className="text-2xl font-bold text-green-600">{formatVotes(forVotes)}</div>
            <Progress value={forPct} className="h-1.5" indicatorClassName="bg-green-500" />
          </CardContent>
        </Card>

        {/* Against */}
        <Card className="py-2 gap-3">
          <CardHeader className="pb-1 px-4">
            <CardTitle className="text-md font-semibold text-foreground/90">Against</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 py-1 px-4">
            <div className="text-2xl font-bold text-red-600">{formatVotes(againstVotes)}</div>
            <Progress value={againstPct} className="h-1.5" indicatorClassName="bg-red-500" />
          </CardContent>
        </Card>

        {/* Abstain */}
        <Card className="py-2 gap-3">
          <CardHeader className="pb-1 px-4">
            <CardTitle className="text-md font-semibold text-foreground/90">Abstain</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 py-1 px-4">
            <div className="text-2xl font-bold text-muted-foreground">
              {formatVotes(abstainVotes)}
            </div>
            <Progress
              value={abstainPct}
              className="h-1.5"
              indicatorClassName="bg-muted-foreground/40"
            />
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Threshold / Ended / Snapshot */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {/* Threshold first */}
        <Card className="py-2 gap-3">
          <CardHeader className="pb-1 px-4">
            <CardTitle className="text-md font-semibold text-foreground/90">Threshold</CardTitle>
          </CardHeader>
          <CardContent className="py-1 px-4">
            <div className="text-2xl font-bold">{formatVotes(quorumVotes)} votes</div>
            <div className="text-xs text-muted-foreground">Current threshold</div>
          </CardContent>
        </Card>

        {endDate && (
          <Card className="py-2 gap-3">
            <CardHeader className="pb-1 px-4">
              <CardTitle className="text-md font-semibold text-foreground/90">
                {forNum + againstNum + abstainNum > 0 && endDate.getTime() < Date.now()
                  ? "Ended"
                  : "Ends"}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-1 px-4">
              <div className="text-2xl font-semibold">
                {endDate.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {endDate.toLocaleTimeString(undefined, {
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
          <Card className="py-2 gap-3">
            <CardHeader className="pb-1 px-4">
              <CardTitle className="text-md font-semibold text-foreground/90">Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="py-1 px-4">
              <div className="text-2xl font-semibold">#{formatBlock(snapshotBlock)}</div>
              <div className="text-xs text-muted-foreground">Taken at block</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
