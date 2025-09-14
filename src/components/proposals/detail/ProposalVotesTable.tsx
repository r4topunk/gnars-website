"use client";

import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

interface VoteRow {
  voter: string;
  choice: VoteChoice;
  votes: string;
}

interface ProposalVotesTableProps {
  votes?: VoteRow[];
}

export function ProposalVotesTable({ votes }: ProposalVotesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Individual Votes</CardTitle>
      </CardHeader>
      <CardContent>
        {votes && votes.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voter</TableHead>
                <TableHead>Choice</TableHead>
                <TableHead className="text-right">Vote Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {votes.map((vote, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <AddressDisplay
                      address={vote.voter}
                      variant="compact"
                      showAvatar={false}
                      showCopy={false}
                      showExplorer={false}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        vote.choice === "FOR"
                          ? "default"
                          : vote.choice === "AGAINST"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {vote.choice}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {parseFloat(vote.votes).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground py-8">No votes have been cast yet</p>
        )}
      </CardContent>
    </Card>
  );
}
