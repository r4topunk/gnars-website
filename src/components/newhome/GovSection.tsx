import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuctionPanel } from "@/components/newhome/AuctionPanel";
import { FeedPanel } from "@/components/newhome/FeedPanel";
import { ProposalsPanel } from "@/components/newhome/ProposalsPanel";
import {
  ActivityFeedSkeleton,
  RecentProposalsSkeleton,
} from "@/components/skeletons/home-skeletons";
import { toListProposal } from "@/lib/proposal-list-payload";
import { ProposalStatus } from "@/lib/schemas/proposals";
import { getAllFeedEvents } from "@/services/feed-events";
import { listProposals } from "@/services/proposals";
import { Eyebrow, SHELL } from "./primitives";

// Both panels swallow their fetch error and render empty.
//
// These run during static generation, and an unhandled throw inside a Suspense
// boundary fails the whole export — one transient Goldsky 5xx would take the
// production deploy down with it, which is a bad trade for two panels that are
// perfectly readable with no rows. The page revalidates every 5 minutes, so an
// empty render self-heals on the next pass.
async function Proposals() {
  const proposals = (await listProposals(8).catch(() => []))
    .map(toListProposal)
    .filter((p) => p.status !== ProposalStatus.CANCELLED)
    .slice(0, 2);
  return <ProposalsPanel proposals={proposals} />;
}

async function Feed() {
  const events = await getAllFeedEvents(24 * 30).catch(() => []);
  return <FeedPanel events={events} limit={5} />;
}

/**
 * Where the money lands: the live auction beside the proposals it funds and the
 * feed of votes deciding them.
 *
 * All three panels are drawn for this composition rather than reusing the
 * dashboard cards — the reference reads as one control surface, and three
 * independently-chromed cards read as three widgets parked next to each other.
 * The data and the auction's write path are still the production ones.
 */
export async function GovSection() {
  const t = await getTranslations("newhome.gov");

  return (
    <section id="gov" className="px-6 pb-22 pt-18">
      <div className={`${SHELL} flex flex-col gap-6 px-0`}>
        <div className="flex flex-col gap-2.5">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h2 className="text-[clamp(1.875rem,3.4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.025em] text-neutral-50">
            {t("title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <AuctionPanel />

          <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900 p-5">
            <Suspense fallback={<RecentProposalsSkeleton />}>
              <Proposals />
            </Suspense>
            <div className="h-px bg-white/[0.08]" />
            <Suspense fallback={<ActivityFeedSkeleton responsive />}>
              <Feed />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
