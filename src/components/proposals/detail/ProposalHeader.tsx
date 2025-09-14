"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { ProposalStatus } from "@/lib/schemas/proposals";

interface ProposalHeaderProps {
  proposalNumber: number;
  title: string;
  proposer: string;
  status: ProposalStatus;
  transactionHash?: string;
}

const getStatusBadgeVariant = (status: ProposalStatus) => {
  switch (status) {
    case ProposalStatus.EXECUTED:
      return "default" as const; // green
    case ProposalStatus.ACTIVE:
      return "secondary" as const; // blue
    case ProposalStatus.DEFEATED:
    case ProposalStatus.VETOED:
      return "destructive" as const; // red
    case ProposalStatus.CANCELLED:
      return "outline" as const; // gray
    default:
      return "secondary" as const;
  }
};

const getStatusLabel = (status: ProposalStatus) => {
  return status;
};

export function ProposalHeader({
  proposalNumber,
  title,
  proposer,
  status,
  transactionHash,
}: ProposalHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Proposal {proposalNumber}</span>
        <Badge variant={getStatusBadgeVariant(status)}>{getStatusLabel(status)}</Badge>
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
          <AddressDisplay
            address={proposer}
            variant="compact"
            showAvatar={false}
            showCopy={false}
            showExplorer={false}
          />
        </Link>
      </div>
    </div>
  );
}
