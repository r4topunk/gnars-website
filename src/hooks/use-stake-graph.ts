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

export function useStakeGraph(nonce = 0): StakeGraph | null {
  const { data } = useQuery({
    queryKey: ["stake-graph", nonce],
    queryFn: fetchStakeGraph,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  return data ?? null;
}
