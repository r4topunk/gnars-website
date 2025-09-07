/**
 * DroposalHeader
 * Renders the title area with status, number, price/edition badges, and back link.
 *
 * Props:
 * - proposalNumber: displayed as #N
 * - title: optional title from proposal
 * - fallbackName: optional decoded name used when title missing
 * - createdAtMs: unix ms timestamp for created date
 * - isExecuted: controls status badge variant/text
 * - priceEth: formatted ETH price string
 * - editionSize: string or "Open"
 */
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DroposalHeaderProps {
  proposalNumber: number;
  title?: string | null;
  fallbackName?: string | null;
  createdAtMs: number;
  isExecuted: boolean;
  priceEth: string;
  editionSize: string;
}

export function DroposalHeader(props: DroposalHeaderProps) {
  const {
    proposalNumber,
    title,
    fallbackName,
    createdAtMs,
    isExecuted,
    priceEth,
    editionSize,
  } = props;

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={isExecuted ? "secondary" : "outline"}>
            {isExecuted ? "Executed" : "Pending"}
          </Badge>
          <span className="text-xs text-muted-foreground">#{proposalNumber}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {title || fallbackName || `Droposal #${proposalNumber}`}
        </h1>
        <div className="mt-3 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <Badge variant="secondary">{Number(priceEth) === 0 ? "Free" : `${priceEth} ETH`}</Badge>
          <Badge variant="secondary">Edition: {editionSize === "0" ? "Open" : editionSize}</Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(createdAtMs).toLocaleDateString()}
          </span>
        </div>
        {title && <p className="text-muted-foreground mt-2 max-w-2xl">{title}</p>}
      </div>
      <div className="hidden lg:flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/droposals">Back to Droposals</Link>
        </Button>
      </div>
    </div>
  );
}


