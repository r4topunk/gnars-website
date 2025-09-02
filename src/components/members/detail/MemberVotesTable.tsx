"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface VoteItem {
  id: string | number;
  proposalNumber: number;
  proposalTitle?: string | null;
  support: string;
  weight: string | number;
  reason?: string | null;
  timestamp: string | number | Date;
}

interface MemberVotesTableProps {
  votes: VoteItem[];
}

export function MemberVotesTable({ votes }: MemberVotesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Votes & Comments</CardTitle>
      </CardHeader>
      <CardContent>
        {votes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No votes from this member.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proposal</TableHead>
                <TableHead className="text-center">Vote</TableHead>
                <TableHead className="text-right">Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {votes.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1 whitespace-normal break-words">
                      <a href={`/proposals/${v.proposalNumber}`} className="font-medium hover:underline">
                        {v.proposalTitle && v.proposalTitle.trim().length > 0
                          ? `${v.proposalNumber} - ${v.proposalTitle}`
                          : `${v.proposalNumber}`}
                      </a>
                      {v.reason ? (
                        <span className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{v.reason}</span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {new Date(v.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="default"
                      className={
                        v.support === "FOR"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : v.support === "AGAINST"
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-zinc-600 hover:bg-zinc-700 text-white"
                      }
                    >
                      {v.support}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{v.weight}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}


