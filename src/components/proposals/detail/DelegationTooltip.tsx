// src/components/proposals/detail/DelegationTooltip.tsx
"use client";

import { Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DelegatorWithCount } from "@/services/members";

type DelegationStatus = "loading" | "done" | "error";

interface DelegationTooltipProps {
  totalVotes: number;
  delegators: DelegatorWithCount[];
  status: DelegationStatus;
}

export function DelegationTooltip({ totalVotes, delegators, status }: DelegationTooltipProps) {
  // Hide entirely when we know there are no delegators
  if (status === "done" && delegators.length === 0) return null;

  const delegatedSum = delegators.reduce((acc, d) => acc + d.tokenCount, 0);
  const ownVotes = status === "done" ? Math.max(0, totalVotes - delegatedSum) : null;

  return (
    <span className="flex items-center gap-1">
      {ownVotes !== null && (
        <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded">
          {ownVotes} own
        </span>
      )}
      {status === "loading" && (
        <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded inline-flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" />
        </span>
      )}
      {status === "done" && delegators.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded border border-border cursor-pointer select-none">
              {delegatedSum} delegated
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="p-0 overflow-hidden min-w-[160px]">
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-2">
                Delegated from
              </p>
              <div className="space-y-1">
                {delegators.map((d) => (
                  <div key={d.owner} className="flex justify-between gap-6 text-xs">
                    <span className="opacity-80 font-mono">
                      {d.owner.slice(0, 6)}…{d.owner.slice(-4)}
                    </span>
                    <span className="font-semibold">{d.tokenCount}</span>
                  </div>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
      {status === "error" && (
        <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded opacity-70">
          delegated?
        </span>
      )}
    </span>
  );
}
