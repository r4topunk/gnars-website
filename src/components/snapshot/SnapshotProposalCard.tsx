"use client";

import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { SnapshotProposal } from "@/types/snapshot";

interface SnapshotProposalCardProps {
  proposal: SnapshotProposal;
}

export function SnapshotProposalCard({ proposal }: SnapshotProposalCardProps) {
  const statusColor = useMemo(() => {
    switch (proposal.state) {
      case "active":
        return "bg-green-500";
      case "closed":
        return "bg-gray-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-400";
    }
  }, [proposal.state]);

  const timeAgo = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- render-time clock read inside memo for "N days ago" label
    const now = Date.now() / 1000;
    const diff = now - proposal.created;
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);

    if (days > 0) return `${days} day${days !== 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    return "recently";
  }, [proposal.created]);

  const winningChoice = useMemo(() => {
    if (!proposal.scores || proposal.scores.length === 0) return null;
    const maxScore = Math.max(...proposal.scores);
    const index = proposal.scores.indexOf(maxScore);
    return proposal.choices[index] ?? null;
  }, [proposal.scores, proposal.choices]);

  return (
    <Link
      href={`/proposals/snapshot/${proposal.id}`}
      className="block rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", statusColor)} />
            <span className="text-sm font-medium capitalize text-muted-foreground">
              {proposal.state}
            </span>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{timeAgo}</span>
          </div>

          <h3 className="text-lg font-semibold leading-tight">{proposal.title}</h3>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {proposal.votes} voter{proposal.votes !== 1 && "s"}
            </span>
            <span>·</span>
            <span>{proposal.scores_total.toFixed(0)} votes</span>
            {winningChoice && (
              <>
                <span>·</span>
                <span className="font-medium text-foreground">Leading: {winningChoice}</span>
              </>
            )}
          </div>

          {proposal.body && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {proposal.body.replace(/!\[.*?\]\(.*?\)/g, "").slice(0, 200)}
            </p>
          )}
        </div>

        <div className="text-right text-sm">
          <div className="font-medium">Snapshot</div>
          <div className="text-muted-foreground">#{proposal.snapshot}</div>
        </div>
      </div>
    </Link>
  );
}
