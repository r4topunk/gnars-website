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
  const { proposalNumber, title, fallbackName } = props;

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {title || fallbackName || `Droposal #${proposalNumber}`}
        </h1>
      </div>
      <div className="hidden lg:flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/droposals">Back to Droposals</Link>
        </Button>
      </div>
    </div>
  );
}
