// src/components/proposals/detail/DelegationTooltip.tsx
"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DelegatorWithCount } from "@/services/members";

interface DelegationTooltipProps {
  voterAddress: string;
  totalVotes: number;
  cache: React.MutableRefObject<Map<string, DelegatorWithCount[]>>;
}

export function DelegationTooltip({ voterAddress, totalVotes, cache }: DelegationTooltipProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [delegators, setDelegators] = useState<DelegatorWithCount[]>([]);

  const handleOpen = useCallback(
    async (open: boolean) => {
      if (!open || status === "loading" || status === "done") return;

      const key = voterAddress.toLowerCase();
      const cached = cache.current.get(key);
      if (cached !== undefined) {
        setDelegators(cached);
        setStatus("done");
        return;
      }

      setStatus("loading");
      try {
        const res = await fetch(`/api/delegators/${key}`);
        if (!res.ok) throw new Error("fetch failed");
        const data: DelegatorWithCount[] = await res.json();
        // Filter out self-delegation artifacts (voter delegating to themselves)
        const filtered = data.filter((d) => d.owner.toLowerCase() !== key);
        cache.current.set(key, filtered);
        setDelegators(filtered);
        setStatus("done");
      } catch {
        setStatus("error");
      }
    },
    [voterAddress, cache]
  );

  // The "delegated" tag is visible on all cards before first hover (lazy-fetch tradeoff).
  // After the first hover, if no delegators are found, the tag disappears and the card
  // looks unchanged. This is the accepted v1 behavior of the lazy-fetch approach.
  if (status === "done" && delegators.length === 0) return null;

  const delegatedSum = delegators.reduce((acc, d) => acc + d.tokenCount, 0);
  // ownVotes only known after fetch; null while idle/loading
  const ownVotes = status === "done" ? Math.max(0, totalVotes - delegatedSum) : null;

  return (
    <span className="flex items-center gap-1">
      {ownVotes !== null && (
        <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded">
          {ownVotes} own
        </span>
      )}
      <Tooltip onOpenChange={handleOpen}>
        <TooltipTrigger asChild>
          <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded border border-border cursor-pointer select-none">
            {status === "done" ? `${delegatedSum} delegated` : "delegated"}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-0 overflow-hidden min-w-[160px]">
          {status === "loading" && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs">
              <Loader2 className="size-3 animate-spin" />
              <span>Loading…</span>
            </div>
          )}
          {status === "error" && (
            <div className="px-3 py-2 text-xs opacity-70">Could not load</div>
          )}
          {status === "done" && (
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
          )}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
