"use client";

import { useEffect, useState } from "react";
import { Vote } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock data structure - in real implementation, this would come from the Builder SDK
interface DaoDelegate {
  delegate: string;
  voteCount: number;
  delegatedBy: string[];
}

// Mock function to simulate fetching delegates from Builder SDK
async function fetchDaoDelegates(): Promise<DaoDelegate[]> {
  // In real implementation, this would query:
  // - DAO.voters from the Builder subgraph
  // - Filter accounts with delegated votes > 0
  // - Sort by vote count descending

  // Mock data for demonstration
  return [
    {
      delegate: "0x1111111111111111111111111111111111111111",
      voteCount: 25,
      delegatedBy: ["0xaaa...", "0xbbb...", "0xccc..."],
    },
    {
      delegate: "0x2222222222222222222222222222222222222222",
      voteCount: 18,
      delegatedBy: ["0xddd...", "0xeee..."],
    },
    {
      delegate: "0x3333333333333333333333333333333333333333",
      voteCount: 12,
      delegatedBy: ["0xfff..."],
    },
    {
      delegate: "0x4444444444444444444444444444444444444444",
      voteCount: 8,
      delegatedBy: ["0x999...", "0x888..."],
    },
    {
      delegate: "0x5555555555555555555555555555555555555555",
      voteCount: 5,
      delegatedBy: ["0x777..."],
    },
  ];
}

// Function to resolve ENS names (mock implementation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function resolveENS(_address: string): Promise<string | null> {
  // In real implementation, this would use a proper ENS resolver
  // For now, return null to show raw addresses
  return null;
}

export function DelegatesList() {
  const [delegates, setDelegates] = useState<DaoDelegate[]>([]);
  const [loading, setLoading] = useState(true);
  const [ensNames, setEnsNames] = useState<Record<string, string>>({});
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

        // Resolve ENS names for each delegate
        const ensPromises = fetchedDelegates.map(async (delegate) => {
          const ensName = await resolveENS(delegate.delegate);
          return { address: delegate.delegate, ensName };
        });

        const ensResults = await Promise.all(ensPromises);
        const ensMap = ensResults.reduce(
          (acc, { address, ensName }) => {
            if (ensName) {
              acc[address] = ensName;
            }
            return acc;
          },
          {} as Record<string, string>,
        );

        setEnsNames(ensMap);
      } catch (error) {
        console.error("Failed to load delegates:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDelegates();
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getDisplayName = (address: string) => {
    const ensName = ensNames[address];
    return ensName || formatAddress(address);
  };

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
                      <span className="font-medium">{getDisplayName(delegate.delegate)}</span>
                      {ensNames[delegate.delegate] && (
                        <span className="text-xs text-muted-foreground">
                          {formatAddress(delegate.delegate)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {delegate.delegatedBy.length} delegator
                        {delegate.delegatedBy.length !== 1 ? "s" : ""}
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
