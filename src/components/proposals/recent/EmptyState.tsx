"use client";

import { CalendarDays } from "lucide-react";

export function RecentProposalsEmptyState() {
  return (
    <div className="text-center py-8">
      <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Recent Proposals</h3>
      <p className="text-muted-foreground">Check back later for new governance proposals.</p>
    </div>
  );
}
