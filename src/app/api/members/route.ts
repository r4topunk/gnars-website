import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchFarcasterProfilesByAddress } from "@/services/farcaster";
import {
  fetchActiveVotesForVoters,
  fetchAllMembers,
  fetchNonCanceledProposalsCount,
  fetchVotesCountForVoters,
  fetchVoteSupportForVoters,
  type MemberListItem,
} from "@/services/members";

/**
 * Cached function to fetch and enrich member data.
 * Uses Next.js unstable_cache for reliable caching in serverless environments.
 * Revalidates every 5 minutes to prevent subgraph rate limit abuse.
 */
const getCachedMembers = unstable_cache(
  async (): Promise<MemberListItem[]> => {
    const members = await fetchAllMembers();
    const owners = members.map((m) => m.owner);
    const [
      votesCountMap,
      activeVotesMap,
      nonCanceledCount,
      voteSupportMap,
      farcasterProfiles,
    ] = await Promise.all([
      fetchVotesCountForVoters(owners),
      fetchActiveVotesForVoters(owners),
      fetchNonCanceledProposalsCount(),
      fetchVoteSupportForVoters(owners),
      fetchFarcasterProfilesByAddress(owners),
    ]);

    return members.map((m) => {
      const key = m.owner.toLowerCase();
      const castVotes = votesCountMap[key] || 0;
      const activeVotes = activeVotesMap[key] || 0;
      const support = voteSupportMap[key] || { total: 0, forCount: 0 };
      const attendancePct =
        nonCanceledCount > 0 ? Math.round((castVotes / nonCanceledCount) * 100) : 0;
      const likePct = support.total > 0 ? Math.round((support.forCount / support.total) * 100) : 0;
      return {
        ...m,
        votesCount: castVotes,
        activeVotes,
        attendancePct,
        likePct,
        farcaster: farcasterProfiles[key] ?? null,
      };
    });
  },
  ["members-list"],
  {
    revalidate: 300, // 5 minutes
    tags: ["members"],
  },
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").toLowerCase();

    const members = await getCachedMembers();

    const filtered: MemberListItem[] = search
      ? members.filter(
          (m) =>
            m.owner.toLowerCase().includes(search) || m.delegate.toLowerCase().includes(search),
        )
      : members;

    return NextResponse.json({ members: filtered });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
