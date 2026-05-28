import { Badge } from "@/components/ui/badge";
import { getRoundStateLabel } from "@/features/rounds/state";
import type { RoundState } from "@/features/rounds/types";
import { cn } from "@/lib/utils";

const stateStyles: Record<RoundState, string> = {
  draft: "border-muted-foreground/20 bg-muted text-muted-foreground",
  upcoming: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  submissions_open:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  voting_open: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  ended: "border-foreground/15 bg-foreground/10 text-foreground",
  archived: "border-destructive/20 bg-destructive/10 text-destructive",
};

export function RoundStatusPill({ state, className }: { state: RoundState; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full capitalize", stateStyles[state], className)}
    >
      {getRoundStateLabel(state)}
    </Badge>
  );
}
