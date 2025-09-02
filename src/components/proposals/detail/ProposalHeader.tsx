"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddressDisplay } from "@/components/ui/address-display";

type ProposalState =
  | "PENDING"
  | "ACTIVE"
  | "DEFEATED"
  | "SUCCEEDED"
  | "QUEUED"
  | "EXECUTED"
  | "CANCELED"
  | "VETOED";

interface ProposalHeaderProps {
  proposalNumber: number;
  title: string;
  proposer: string;
  state: ProposalState;
  transactionHash?: string;
}

const getStatusBadgeVariant = (state: ProposalState) => {
  switch (state) {
    case "EXECUTED":
      return "default" as const; // green
    case "ACTIVE":
      return "secondary" as const; // blue
    case "DEFEATED":
    case "VETOED":
      return "destructive" as const; // red
    case "CANCELED":
      return "outline" as const; // gray
    default:
      return "secondary" as const;
  }
};

const getStatusLabel = (state: ProposalState) => {
  switch (state) {
    case "PENDING":
      return "Pending";
    case "ACTIVE":
      return "Active";
    case "DEFEATED":
      return "Defeated";
    case "SUCCEEDED":
      return "Succeeded";
    case "QUEUED":
      return "Queued";
    case "EXECUTED":
      return "Executed";
    case "CANCELED":
      return "Canceled";
    case "VETOED":
      return "Vetoed";
    default:
      return state;
  }
};

export function ProposalHeader({ proposalNumber, title, proposer, state, transactionHash }: ProposalHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Proposal {proposalNumber}</span>
        <Badge variant={getStatusBadgeVariant(state)}>{getStatusLabel(state)}</Badge>
        {transactionHash ? (
          <a
            href={`https://basescan.org/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-muted-foreground hover:text-foreground"
            aria-label="Open in explorer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <div className="text-sm text-muted-foreground">
        By{" "}
        <Link href={`/members/${proposer}`} className="hover:underline">
          <AddressDisplay address={proposer} variant="compact" showAvatar={false} showCopy={false} showExplorer={false} />
        </Link>
      </div>
    </div>
  );
}


