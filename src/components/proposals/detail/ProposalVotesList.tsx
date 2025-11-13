"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Markdown } from "@/components/common/Markdown";
import { useActiveMembers } from "@/hooks/use-active-members";

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
  proposalId?: string;
  isActive?: boolean;
}

// Match the badge color treatment used on ProposalCard status badges
const voteBadgeClasses: Record<VoteChoice, string> = {
  FOR: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  AGAINST: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  ABSTAIN: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export function ProposalVotesList({ title = "Individual Votes", votes, isActive = false }: ProposalVotesListProps) {
  const hasVotes = Array.isArray(votes) && votes.length > 0;
  const [isOpen, setIsOpen] = useState(false);

  // Fetch active members only if proposal is active
  const { data: activeMembers, isLoading: activeMembersLoading } = useActiveMembers(15, 5, isActive);

  // Filter out members who already voted (already sorted by votingPower from API)
  const nonVoters = isActive && activeMembers
    ? activeMembers
        .filter(member => {
          const memberAddress = member.address.toLowerCase();
          return !votes?.some(vote => vote.voter.toLowerCase() === memberAddress);
        })
    : [];

  const showNonVotersSection = isActive && nonVoters.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasVotes ? (
          <>
            {votes!.map((vote, index) => (
              <div
                key={`${vote.voter}-${index}`}
                className="rounded-lg border bg-card text-card-foreground p-3"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-2">
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
            ))}

            {(showNonVotersSection || (isActive && activeMembersLoading)) && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-muted-foreground hover:text-foreground"
                    disabled={activeMembersLoading}
                  >
                    {activeMembersLoading ? (
                      <>Loading members who haven&apos;t voted...</>
                    ) : (
                      <>
                        {isOpen ? <ChevronUp className="mr-2" /> : <ChevronDown className="mr-2" />}
                        {nonVoters.length} active member{nonVoters.length === 1 ? "" : "s"} haven&apos;t voted yet
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {activeMembersLoading ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">Loading...</p>
                  ) : (
                    nonVoters.map((member) => (
                      <div
                        key={member.address}
                        className="rounded-lg border border-dashed bg-muted/30 text-card-foreground p-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <AddressDisplay
                              address={member.address}
                              variant="compact"
                              showAvatar
                              showCopy={false}
                              showExplorer={false}
                              avatarSize="md"
                            />
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>•</span>
                              <span className="whitespace-nowrap">{member.votingPower} vote{member.votingPower === 1 ? "" : "s"}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs self-start sm:self-center shrink-0">
                            {member.votesInWindow} recent vote{member.votesInWindow === 1 ? "" : "s"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground py-8">No votes have been cast yet</p>
        )}
      </CardContent>
    </Card>
  );
}


