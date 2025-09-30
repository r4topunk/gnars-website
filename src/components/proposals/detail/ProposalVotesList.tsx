"use client";

import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Markdown } from "@/components/common/Markdown";

type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

export interface ProposalVoteItem {
  voter: string;
  choice: VoteChoice;
  votes: string;
  reason?: string | null;
}

export interface ProposalVotesListProps {
  title?: string;
  votes?: ProposalVoteItem[];
}

// Match the badge color treatment used on ProposalCard status badges
const voteBadgeClasses: Record<VoteChoice, string> = {
  FOR: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  AGAINST: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  ABSTAIN: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export function ProposalVotesList({ title = "Individual Votes", votes }: ProposalVotesListProps) {
  const hasVotes = Array.isArray(votes) && votes.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasVotes ? (
          votes!.map((vote, index) => (
            <div
              key={`${vote.voter}-${index}`}
              className="rounded-lg border bg-card text-card-foreground p-3"
            >
              <div className="flex items-center gap-2">
                <AddressDisplay
                  address={vote.voter}
                  variant="compact"
                  showAvatar
                  showCopy={false}
                  showExplorer={false}
                  avatarSize="md"
                />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span>voted</span>
                  <Badge className={`${voteBadgeClasses[vote.choice]} text-xs`}>
                    {vote.choice}
                  </Badge>
                  <span>
                    with <b>{Number(vote.votes).toLocaleString()}</b>{" "}
                    vote{Number(vote.votes) === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              {vote.reason && vote.reason.trim().length > 0 ? (
                <div className="mt-3 rounded-md border bg-muted/40 p-3">
                  <Markdown className="prose-sm">{vote.reason}</Markdown>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">No votes have been cast yet</p>
        )}
      </CardContent>
    </Card>
  );
}


