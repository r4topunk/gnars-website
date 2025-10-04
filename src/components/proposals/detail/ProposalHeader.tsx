"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import { AddressDisplay } from "@/components/ui/address-display";
import { ProposalStatus } from "@/lib/schemas/proposals";

interface ProposalHeaderProps {
  proposalNumber: number;
  title: string;
  proposer: string;
  status: ProposalStatus;
  transactionHash?: string;
}

export function ProposalHeader({
  proposalNumber,
  title,
  proposer,
  status,
  transactionHash,
}: ProposalHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-md text-muted-foreground">
        <span>Proposal {proposalNumber}</span>
        <ProposalStatusBadge status={status} />
        {transactionHash ? (
          <Link
            href={`https://basescan.org/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-muted-foreground hover:text-foreground"
            aria-label="Open in explorer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <div className="text-sm text-muted-foreground">
        By{" "}
        <AddressDisplay
          address={proposer}
          variant="compact"
          showAvatar={false}
          showCopy={false}
          showExplorer={false}
        />
      </div>
    </div>
  );
}
