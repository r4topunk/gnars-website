"use client";

import { useEffect, useState } from "react";
import { Vote } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SUBGRAPH, GNARS_ADDRESSES } from "@/lib/config";

interface DaoDelegate {
  delegate: string;
  voteCount: number;
  delegatorCount: number;
}

interface SubgraphDaoDelegate {
  id: string;
  delegate: {
    id: string;
  };
  votesCount: string;
  delegators: {
    id: string;
  }[];
}

async function fetchDaoDelegates(): Promise<DaoDelegate[]> {
  const tokenAddress = GNARS_ADDRESSES.token.toLowerCase();

  const query = `{
    daoDelegates(
      where: { dao: "${tokenAddress}", votesCount_gt: 0 }
      orderBy: votesCount
      orderDirection: desc
      first: 50
    ) {
      id
      delegate {
        id
      }
      votesCount
      delegators {
        id
      }
    }
  }`;

  const response = await fetch(SUBGRAPH.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Subgraph request failed: ${response.status}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(json.errors[0]?.message || "Subgraph query error");
  }

  const delegates: SubgraphDaoDelegate[] = json.data?.daoDelegates ?? [];

  return delegates.map((d) => ({
    delegate: d.delegate.id,
    voteCount: parseInt(d.votesCount, 10),
    delegatorCount: d.delegators.length,
  }));
}

export function DelegatesList() {
  const [delegates, setDelegates] = useState<DaoDelegate[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    async function loadDelegates() {
      try {
        setLoading(true);
        const fetchedDelegates = await fetchDaoDelegates();
        setDelegates(fetchedDelegates);

        // Calculate total votes for percentage calculation
        const total = fetchedDelegates.reduce((sum, delegate) => sum + delegate.voteCount, 0);
        setTotalVotes(total);
      } catch (error) {
        console.error("Failed to load delegates:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDelegates();
  }, []);

  const calculateVotePercentage = (voteCount: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((voteCount / totalVotes) * 100);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">Loading delegates...</div>
      </div>
    );
  }

  if (delegates.length === 0) {
    return (
      <div className="text-center py-8">
        <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <div className="text-muted-foreground">No delegates found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Delegate</TableHead>
              <TableHead className="text-right">Votes</TableHead>
              <TableHead className="text-right">Vote %</TableHead>
              <TableHead className="w-32">Distribution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {delegates.map((delegate) => {
              const percentage = calculateVotePercentage(delegate.voteCount);
              return (
                <TableRow key={delegate.delegate}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <AddressDisplay
                        address={delegate.delegate}
                        variant="compact"
                        showAvatar={false}
                        showCopy={false}
                        showExplorer={false}
                      />
                      <span className="text-xs text-muted-foreground">
                        {delegate.delegatorCount} delegator
                        {delegate.delegatorCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">{delegate.voteCount}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-muted-foreground">{percentage}%</span>
                  </TableCell>
                  <TableCell>
                    <Progress value={percentage} className="h-2" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div>Total voting power: {totalVotes} votes</div>
        <div>Showing {delegates.length} delegates with voting power</div>
      </div>
    </div>
  );
}
