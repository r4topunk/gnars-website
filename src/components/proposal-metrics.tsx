import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProposalMetricsProps {
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorumVotes: string;
  snapshotBlock?: number;
  endDate?: Date;
}

export function ProposalMetrics({
  forVotes,
  againstVotes,
  abstainVotes,
  quorumVotes,
  snapshotBlock,
  endDate,
}: ProposalMetricsProps) {
  const formatVotes = (votes: string) => {
    const num = parseFloat(votes);
    return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
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

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-600">For Votes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatVotes(forVotes)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-600">Against Votes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatVotes(againstVotes)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Abstain Votes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatVotes(abstainVotes)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Threshold</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatVotes(quorumVotes)}</div>
          <p className="text-xs text-muted-foreground mt-1">Quorum required</p>
        </CardContent>
      </Card>

      {endDate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">End Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatDate(endDate)}</div>
          </CardContent>
        </Card>
      )}

      {snapshotBlock && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Snapshot Block
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-mono">{formatBlock(snapshotBlock)}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
