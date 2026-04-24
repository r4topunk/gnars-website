"use client";

import { useEffect, useState } from "react";

export type IndexingStatus = "idle" | "pending" | "ready" | "timeout" | "error";

export interface UseProposalIndexingResult {
  status: IndexingStatus;
  proposalNumber: number | null;
}

/**
 * Poll /api/proposals/:id with the onchain bytes32 proposalId until the
 * subgraph indexes it (or the budget expires). Once resolved, returns the
 * integer proposalNumber used in site URLs.
 */
export function useProposalIndexing(
  proposalId: `0x${string}` | undefined,
  opts: { intervalMs?: number; budgetMs?: number } = {},
): UseProposalIndexingResult {
  const { intervalMs = 4_000, budgetMs = 120_000 } = opts;
  const [status, setStatus] = useState<IndexingStatus>("idle");
  const [proposalNumber, setProposalNumber] = useState<number | null>(null);

  useEffect(() => {
    if (!proposalId) {
      setStatus("idle");
      setProposalNumber(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    setStatus("pending");
    setProposalNumber(null);

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/proposals/${proposalId}`, { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as { proposalNumber?: number };
          if (typeof json.proposalNumber === "number") {
            if (cancelled) return;
            setProposalNumber(json.proposalNumber);
            setStatus("ready");
            return;
          }
        } else if (res.status !== 404) {
          if (cancelled) return;
          setStatus("error");
          return;
        }
      } catch {
        // transient — fall through to reschedule
      }

      if (cancelled) return;
      if (Date.now() - startedAt > budgetMs) {
        setStatus("timeout");
        return;
      }
      timer = setTimeout(poll, intervalMs);
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [proposalId, intervalMs, budgetMs]);

  return { status, proposalNumber };
}
