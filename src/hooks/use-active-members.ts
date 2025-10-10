import { useQuery } from "@tanstack/react-query";
import type { ActiveMember } from "@/services/members";

async function fetchActiveMembersFromAPI(
  window: number = 10,
  threshold: number = 5,
): Promise<ActiveMember[]> {
  const url = new URL("/api/members/active", window.location.origin);
  url.searchParams.set("window", String(window));
  url.searchParams.set("threshold", String(threshold));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    let msg = `Failed to fetch active members: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = `${msg} - ${body.error}`;
    } catch {}
    throw new Error(msg);
  }

  const json = (await res.json()) as { activeMembers: ActiveMember[] };
  return json.activeMembers;
}

export function useActiveMembers(window: number = 10, threshold: number = 5) {
  return useQuery({
    queryKey: ["active-members", window, threshold],
    queryFn: () => fetchActiveMembersFromAPI(window, threshold),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

