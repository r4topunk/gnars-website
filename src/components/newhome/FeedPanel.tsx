import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { FeedEvent } from "@/lib/types/feed-events";
import { avatarGradient, shortAge, truncateAddress, VOTE_COLOR } from "./gov-ui";

/** What the panel can draw as a one-line sentence. Everything else is dropped. */
// `timestamp` stays in the subgraph's unix SECONDS here; the row converts on render.
type Row = {
  id: string;
  actor: string;
  timestamp: number;
  verb: "created" | "voted";
  vote?: { support: "FOR" | "AGAINST" | "ABSTAIN"; weight: number };
  proposalNumber: number;
  proposalTitle: string;
};

function toRow(event: FeedEvent): Row | null {
  if (event.type === "ProposalCreated") {
    return {
      id: event.id,
      actor: event.proposer,
      timestamp: event.timestamp,
      verb: "created",
      proposalNumber: event.proposalNumber,
      proposalTitle: event.title,
    };
  }
  if (event.type === "VoteCast") {
    return {
      id: event.id,
      actor: event.voter,
      timestamp: event.timestamp,
      verb: "voted",
      vote: { support: event.support, weight: event.weight },
      proposalNumber: event.proposalNumber,
      proposalTitle: event.proposalTitle,
    };
  }
  return null;
}

const SUPPORT_COLOR = {
  FOR: VOTE_COLOR.for,
  AGAINST: VOTE_COLOR.against,
  ABSTAIN: VOTE_COLOR.abstain,
} as const;

/**
 * The governance feed, reduced to the two events the reference shows: someone
 * created a proposal, or someone voted on one. Each row is a coloured identity
 * disc, the truncated address, a right-aligned age, then one sentence with the
 * vote and weight coloured and the proposal in bold.
 *
 * Mints, transfers and auction chatter are filtered out — the panel sits under
 * "Recent proposals" and is read as the governance ticker, not the whole chain.
 */
export async function FeedPanel({ events, limit = 5 }: { events: FeedEvent[]; limit?: number }) {
  const t = await getTranslations("newhome.gov");
  // One clock for the whole list so the ages are consistent with each other.
  // eslint-disable-next-line react-hooks/purity -- server component, rendered once per request; the timestamp IS the snapshot
  const now = Date.now();
  const rows = events
    .map(toRow)
    .filter((r): r is Row => r !== null)
    .slice(0, limit);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-base font-bold text-foreground">
          {t("liveFeed")}
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ background: VOTE_COLOR.for, animation: "gnars-pulse 1.8s infinite" }}
          />
        </span>
        <Link
          href="/feed"
          className="text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
        >
          {t("viewAll")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground/70">{t("feedEmpty")}</p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-2 border-t border-white/[0.07] py-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="size-6 shrink-0 rounded-full"
                style={{ backgroundImage: avatarGradient(row.actor) }}
              />
              <span className="font-mono text-[13px] font-semibold text-foreground">
                {truncateAddress(row.actor)}
              </span>
              <span className="ml-auto shrink-0 text-[11.5px] text-muted-foreground/70">
                {shortAge(row.timestamp * 1000, now)}
              </span>
            </div>
            <p className="pl-[34px] text-[13.5px] leading-[1.5] text-muted-foreground">
              {row.verb === "created" ? (
                t("feedCreated")
              ) : (
                <>
                  {t("feedVoted")}{" "}
                  <span className="font-bold" style={{ color: SUPPORT_COLOR[row.vote!.support] }}>
                    {row.vote!.support} ({row.vote!.weight})
                  </span>{" "}
                  {t("feedOn")}
                </>
              )}{" "}
              <Link
                href={`/proposals/base/${row.proposalNumber}`}
                className="font-bold text-foreground hover:underline"
              >
                #{row.proposalNumber} {row.proposalTitle}
              </Link>
            </p>
          </div>
        ))
      )}
    </div>
  );
}
