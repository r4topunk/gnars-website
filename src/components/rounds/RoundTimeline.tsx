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
  const progressPercent = state === "ended" ? 100 : state === "voting_open" ? 50 : 0;
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
      <div className="relative grid gap-5 md:grid-cols-3 md:gap-0">
        <div
          className="absolute top-4 hidden h-1 rounded-full bg-primary md:block"
          style={{ left: 18, right: 18 }}
        />
        <div
          className="absolute top-4 hidden h-1 rounded-full bg-emerald-500 transition-all md:block"
          style={{
            left: 18,
            width: `calc((100% - 36px) * ${progressPercent / 100})`,
          }}
        />
        {steps.map((step, index) => (
          <div
            key={step.label}
            className={cn(
              "relative flex gap-3 md:flex-col",
              index === 0 && "md:items-start md:text-left",
              index === 1 && "md:items-center md:text-center",
              index === 2 && "md:items-end md:text-right",
            )}
          >
            <div
              className={cn(
                "z-10 flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                step.complete
                  ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                  : "border-primary bg-primary text-primary-foreground shadow-sm",
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
