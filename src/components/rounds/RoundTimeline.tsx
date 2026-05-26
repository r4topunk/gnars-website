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
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <div key={step.label} className="flex gap-3 md:flex-col">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full border",
                step.complete
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              <Check className="size-4" />
            </div>
            <div>
              <div className="font-medium">{step.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{formatDateTime(step.date)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
