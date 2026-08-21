"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { PropdateCard } from "@/components/proposals/detail/PropdateCard";
import { Link } from "@/i18n/navigation";
import type { Propdate } from "@/services/propdates";

/** Max propdates shown inline on a rail page before linking out to the full list. */
const MAX_INLINE = 3;

interface ProposalWithPropdatesJSON {
  proposal: { proposalNumber: number };
  propdates: Propdate[];
  updateCount: number;
}

interface RailPropdatesProps {
  proposalNumber: number;
}

/**
 * Auto-links a rail to the onchain propdates of its funding proposal.
 *
 * Client component on purpose: it reuses the already-cached
 * `/api/propdates/enriched` endpoint (revalidate=300 + CDN) so the rail page
 * stays fully static — no extra SSR/ISR cost. Renders nothing when the proposal
 * has no propdates, so Snapshot/Nouns/organic rails are no-ops.
 */
export function RailPropdates({ proposalNumber }: RailPropdatesProps) {
  const t = useTranslations("installations");
  const { data } = useQuery<ProposalWithPropdatesJSON[]>({
    queryKey: ["propdates-feed-enriched"],
    queryFn: () => fetch("/api/propdates/enriched").then((r) => r.json()),
  });

  const entry = data?.find((e) => e.proposal.proposalNumber === proposalNumber);
  if (!entry || entry.propdates.length === 0) return null;

  const visible = entry.propdates.slice(0, MAX_INLINE);
  const allUpdatesHref = `/proposals/base/${proposalNumber}?tab=propdates`;

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{t("nogglesrails.detail.updates")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("nogglesrails.detail.updatesSubtitle")}
          </p>
        </div>
        {entry.updateCount > MAX_INLINE && (
          <Link
            href={allUpdatesHref}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t("nogglesrails.detail.viewAllUpdates")}
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {visible.map((propdate) => (
          <PropdateCard key={propdate.txid} propdate={propdate} />
        ))}
      </div>
    </div>
  );
}
