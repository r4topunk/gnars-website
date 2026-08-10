import { getTranslations } from "next-intl/server";
import type { Proposal } from "@/components/proposals/types";
import { Link } from "@/i18n/navigation";
import { ProposalStatus } from "@/lib/schemas/proposals";
import { VOTE_COLOR } from "./gov-ui";

/** Status pill palette: [background, text, border]. */
const STATUS_TONE: Partial<Record<ProposalStatus, [string, string, string]>> = {
  [ProposalStatus.ACTIVE]: ["rgba(30,58,138,.25)", "#93c5fd", "rgba(59,130,246,.25)"],
  [ProposalStatus.PENDING]: ["rgba(30,58,138,.25)", "#93c5fd", "rgba(59,130,246,.25)"],
  [ProposalStatus.QUEUED]: ["rgba(234,179,8,.1)", "#facc15", "rgba(234,179,8,.2)"],
  [ProposalStatus.SUCCEEDED]: ["rgba(16,185,129,.1)", "#34d399", "rgba(16,185,129,.2)"],
  [ProposalStatus.EXECUTED]: ["rgba(16,185,129,.1)", "#34d399", "rgba(16,185,129,.2)"],
};
const NEUTRAL_TONE: [string, string, string] = [
  "rgba(38,38,38,.8)",
  "#a3a3a3",
  "rgba(255,255,255,.1)",
];

/**
 * Which message renders the vote window: `2d 6h left` while it is open, `7d ago`
 * once it has closed. Returns the key and its values rather than a string so the
 * caller owns the translator — computed on the server, so it is a render-time
 * snapshot, accurate to the revalidate window.
 */
function timeMessage(
  voteEnd: string,
  isOpen: boolean,
  now: number,
): {
  key: "timeLeftDh" | "timeLeftH" | "timeAgoD" | "timeAgoH";
  values: Record<string, number>;
} | null {
  const end = new Date(voteEnd).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - now;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  if (diff > 0 && isOpen) {
    return days > 0
      ? { key: "timeLeftDh", values: { days, hours } }
      : { key: "timeLeftH", values: { hours } };
  }
  return days > 0 ? { key: "timeAgoD", values: { days } } : { key: "timeAgoH", values: { hours } };
}

/**
 * Recent proposals as the reference draws them: id, status pill and time on one
 * line, the title, then a single for/against bar with the tallies beneath —
 * dense enough that three of them sit beside the auction without scrolling.
 */
export async function ProposalsPanel({ proposals }: { proposals: Proposal[] }) {
  const t = await getTranslations("newhome.gov");
  // One clock for the list so the labels are consistent with each other.
  // eslint-disable-next-line react-hooks/purity -- server component, rendered once per request; the timestamp IS the snapshot
  const now = Date.now();

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-neutral-50">{t("recentProposals")}</span>
        <Link
          href="/proposals"
          className="text-[12.5px] font-medium text-neutral-400 hover:text-neutral-50"
        >
          {t("viewAll")}
        </Link>
      </div>

      {proposals.map((p) => {
        const [bg, fg, border] = STATUS_TONE[p.status] ?? NEUTRAL_TONE;
        const isOpen = p.status === ProposalStatus.ACTIVE || p.status === ProposalStatus.PENDING;
        // Flex-grow the two bars by their vote counts. A proposal with no votes
        // yet would collapse both to zero, so it falls back to an even split of
        // the muted track.
        const decided = p.forVotes + p.againstVotes;
        const time = timeMessage(p.voteEnd, isOpen, now);

        return (
          <Link
            key={p.proposalId}
            href={`/proposals/base/${p.proposalNumber}`}
            className="flex flex-col gap-2 rounded-[10px] border border-white/[0.08] bg-neutral-800/35 px-3.5 py-3 hover:border-white/20"
          >
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[11.5px] text-neutral-500">#{p.proposalNumber}</span>
              <span
                className="rounded-md border px-2 py-px text-[11.5px] font-medium"
                style={{ background: bg, color: fg, borderColor: border }}
              >
                {p.status}
              </span>
              <span className="ml-auto shrink-0 text-[11.5px] text-neutral-500">
                {time ? t(time.key, time.values) : null}
              </span>
            </div>

            <span className="line-clamp-2 text-sm font-semibold leading-[1.35] text-neutral-50">
              {p.title}
            </span>

            <div className="flex h-1.5 gap-[3px] overflow-hidden rounded-full">
              {decided === 0 ? (
                <span className="flex-1 rounded-full bg-white/10" />
              ) : (
                <>
                  <span
                    className="rounded-full"
                    style={{ flex: p.forVotes, background: VOTE_COLOR.for }}
                  />
                  <span
                    className="rounded-full"
                    style={{ flex: p.againstVotes, background: VOTE_COLOR.against }}
                  />
                </>
              )}
            </div>

            <div className="flex gap-3.5 text-[11.5px] text-neutral-400">
              <span style={{ color: VOTE_COLOR.for }}>{t("for", { count: p.forVotes })}</span>
              <span style={{ color: VOTE_COLOR.against }}>
                {t("against", { count: p.againstVotes })}
              </span>
              <span>{t("abstain", { count: p.abstainVotes })}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
