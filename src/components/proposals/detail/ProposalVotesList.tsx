"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Markdown } from "@/components/common/Markdown";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useActiveMembers } from "@/hooks/use-active-members";
import { getDateFnsLocale } from "@/lib/i18n/format";
import type { DelegatorWithCount } from "@/services/members";
import { DelegationTooltip } from "./DelegationTooltip";

type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

export interface ProposalVoteItem {
  voter: string;
  choice: VoteChoice;
  votes: string;
  reason?: string | null;
  timestamp?: number;
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

export function ProposalVotesList({ title, votes, isActive = false }: ProposalVotesListProps) {
  const t = useTranslations("proposals");
  const locale = useLocale();
  const resolvedTitle = title ?? t("votesList.defaultTitle");
  const hasVotes = Array.isArray(votes) && votes.length > 0;
  const [isOpen, setIsOpen] = useState(false);

  // Eagerly fetch delegation data for all voters on mount
  const [delegationMap, setDelegationMap] = useState<
    Map<string, { delegators: DelegatorWithCount[]; status: "loading" | "done" | "error" }>
  >(new Map());

  const fetchAllDelegations = useCallback(async () => {
    if (!votes || votes.length === 0) return;

    // Mark all as loading
    const initial = new Map<
      string,
      { delegators: DelegatorWithCount[]; status: "loading" | "done" | "error" }
    >();
    for (const vote of votes) {
      initial.set(vote.voter.toLowerCase(), { delegators: [], status: "loading" });
    }
    setDelegationMap(initial);

    type Entry = { delegators: DelegatorWithCount[]; status: "loading" | "done" | "error" };

    // Fetch all in parallel
    const results = new Map<string, Entry>();
    await Promise.all(
      votes.map(async (vote) => {
        const key = vote.voter.toLowerCase();
        try {
          const res = await fetch(`/api/delegators/${key}`);
          if (!res.ok) throw new Error("fetch failed");
          const data: DelegatorWithCount[] = await res.json();
          const filtered = data.filter((d) => d.owner.toLowerCase() !== key);
          results.set(key, { delegators: filtered, status: "done" });
        } catch {
          results.set(key, { delegators: [], status: "error" });
        }
      }),
    );

    setDelegationMap(results);
  }, [votes]);

  useEffect(() => {
    fetchAllDelegations();
  }, [fetchAllDelegations]);

  // Fetch active members only if proposal is active
  const { data: activeMembers, isLoading: activeMembersLoading } = useActiveMembers(
    15,
    5,
    isActive,
  );

  // Filter out members who already voted (already sorted by votingPower from API)
  const nonVoters =
    isActive && activeMembers
      ? activeMembers.filter((member) => {
          const memberAddress = String(member.address ?? "").toLowerCase();
          return !votes?.some((vote) => String(vote.voter ?? "").toLowerCase() === memberAddress);
        })
      : [];

  const showNonVotersSection = isActive && nonVoters.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{resolvedTitle}</CardTitle>
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
                    <span>{t("votesList.voted")}</span>
                    <Badge className={`${voteBadgeClasses[vote.choice]} text-xs`}>
                      {vote.choice}
                    </Badge>
                    <span>
                      {t("votesList.with")} <b>{Number(vote.votes).toLocaleString()}</b>{" "}
                      {Number(vote.votes) === 1 ? t("votesList.vote") : t("votesList.votes")}
                    </span>
                    <DelegationTooltip
                      totalVotes={Number(vote.votes)}
                      delegators={delegationMap.get(vote.voter.toLowerCase())?.delegators ?? []}
                      status={delegationMap.get(vote.voter.toLowerCase())?.status ?? "loading"}
                    />
                    {vote.timestamp ? (
                      <span className="text-muted-foreground text-xs">
                        ·{" "}
                        {formatDistanceToNow(new Date(vote.timestamp * 1000), {
                          addSuffix: true,
                          locale: getDateFnsLocale(locale),
                        })}
                      </span>
                    ) : null}
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
                      <>{t("votesList.loadingMembers")}</>
                    ) : (
                      <>
                        {isOpen ? <ChevronUp className="mr-2" /> : <ChevronDown className="mr-2" />}
                        {t("votesList.haventVotedYet", {
                          count: nonVoters.length,
                          plural: nonVoters.length === 1 ? "" : "s",
                        })}
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {activeMembersLoading ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      {t("votesList.loading")}
                    </p>
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
                              <span className="whitespace-nowrap">
                                {member.votingPower}{" "}
                                {member.votingPower === 1
                                  ? t("votesList.vote")
                                  : t("votesList.votes")}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs self-start sm:self-center shrink-0"
                          >
                            {member.votesInWindow}{" "}
                            {member.votesInWindow === 1
                              ? t("votesList.recentVote")
                              : t("votesList.recentVotes")}
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
          <p className="text-center text-muted-foreground py-8">{t("votesList.noVotesCast")}</p>
        )}
      </CardContent>
    </Card>
  );
}
