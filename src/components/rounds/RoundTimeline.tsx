import { Check } from "lucide-react";
import { getRoundState } from "@/features/rounds/state";
import type { Round } from "@/features/rounds/types";
import { cn } from "@/lib/utils";

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export function RoundTimeline({ round }: { round: Round }) {
  const state = getRoundState(round);
  const progress =
    state === "ended"
      ? "100%"
      : state === "voting_open"
        ? "66%"
        : state === "submissions_open"
          ? "33%"
          : "0%";
  const steps = [
    {
      label: "Submissions open",
      date: round.submissionsOpenAt,
      complete: state === "submissions_open" || state === "voting_open" || state === "ended",
    },
    {
      label: "Voting starts",
      date: round.votingStartsAt,
      complete: state === "voting_open" || state === "ended",
    },
    {
      label: "Round ends",
      date: round.votingEndsAt,
      complete: state === "ended",
    },
  ];

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="relative grid gap-5 md:grid-cols-3">
        <div className="absolute left-[4.5rem] right-[4.5rem] top-4 hidden h-1 rounded-full bg-muted md:block" />
        <div
          className="absolute left-[4.5rem] top-4 hidden h-1 rounded-full bg-primary transition-all md:block"
          style={{ width: `calc((100% - 9rem) * ${parseInt(progress, 10) / 100})` }}
        />
        {steps.map((step, index) => (
          <div
            key={step.label}
            className="relative flex gap-3 md:flex-col md:items-center md:text-center"
          >
            <div
              className={cn(
                "z-10 flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                step.complete
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {step.complete ? <Check className="size-4" /> : index + 1}
            </div>
            <div className="min-w-0">
              <div className="font-medium">{step.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{formatDateTime(step.date)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
