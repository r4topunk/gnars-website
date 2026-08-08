"use client";

// Thin client hook over the cached /api/stake-graph route. The heavy on-chain
// work (multicalled, parallelized) now happens server-side and is cached +
// shared across users, so the orbit paints from JSON instead of doing dozens of
// RPC round-trips on every mount. react-query keeps it warm between navigations.
import { useQuery } from "@tanstack/react-query";
import type { StakeGraph } from "@/services/stake-graph";

export type { OrbitBacker, OrbitAthlete, StakeGraph } from "@/services/stake-graph";

async function fetchStakeGraph(): Promise<StakeGraph> {
  const res = await fetch("/api/stake-graph");
  if (!res.ok) throw new Error("stake-graph");
  return res.json();
}

/**
 * The full query. Use this when the caller has to tell "still loading" apart from
 * "the request failed" — `useStakeGraph` collapses both into `null`, which is how
 * a dead /api/stake-graph used to render as an eternal "loading the flow…". The
 * two hooks share one query key, so react-query serves both from the same cache
 * entry and the same in-flight request.
 */
export function useStakeGraphQuery(nonce = 0) {
  return useQuery({
    queryKey: ["stake-graph", nonce],
    queryFn: fetchStakeGraph,
    // Matched to the CDN `s-maxage` on /api/stake-graph: refetching sooner
    // would just re-serve the same header-cached bytes, since a `revalidateTag`
    // between now and then can't purge that CDN entry.
    //
    // Note a `nonce` bump changes only this query key, not the request URL, so
    // it forces a network fetch but can still be answered by that same CDN
    // entry — it is not a way to see your own deposit immediately.
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
}

export function useStakeGraph(nonce = 0): StakeGraph | null {
  const { data } = useStakeGraphQuery(nonce);
  return data ?? null;
}
