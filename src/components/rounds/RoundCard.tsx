import { ArrowUpRight, Trophy } from "lucide-react";
import { getRoundState } from "@/features/rounds/state";
import type { Round } from "@/features/rounds/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { RoundStatusPill } from "./RoundStatusPill";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export function RoundCard({ round }: { round: Round }) {
  const state = getRoundState(round);
  const dateLabel =
    state === "submissions_open"
      ? `Voting starts ${formatDate(round.votingStartsAt)}`
      : state === "voting_open"
        ? `Voting ends ${formatDate(round.votingEndsAt)}`
        : state === "upcoming"
          ? `Opens ${formatDate(round.submissionsOpenAt)}`
          : `Ended ${formatDate(round.votingEndsAt)}`;

  return (
    <Link
      href={`/rounds/${round.slug}`}
      className="group flex min-h-[420px] flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {round.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={round.image}
            alt={round.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-xl font-semibold">
            {round.title}
          </div>
        )}
        {round.featured && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
            <Trophy className="size-3.5" />
            Featured
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <RoundStatusPill state={state} />
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">{round.title}</h2>
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {round.description || "Round details coming soon."}
          </p>
        </div>
        <div className="mt-auto grid grid-cols-3 gap-3 border-t border-border pt-4 text-sm">
          <RoundStat label="Submissions" value={round.approvedSubmissionCount ?? 0} />
          <RoundStat label="Votes" value={round.totalVotes ?? 0} />
          <RoundStat
            label="Winners"
            value={round.winnerCount}
            className="hidden min-[380px]:block"
          />
        </div>
        <p className="text-xs text-muted-foreground">{dateLabel}</p>
      </div>
    </Link>
  );
}

function RoundStat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="truncate text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
