import { NextResponse } from "next/server";
import { fetchAllMembers, fetchVotesCountForVoters, type MemberListItem } from "@/services/members";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").toLowerCase();

    const members = await fetchAllMembers();
    const votesCountMap = await fetchVotesCountForVoters(members.map((m) => m.owner));

    const withCounts: MemberListItem[] = members.map((m) => ({
      ...m,
      votesCount: votesCountMap[m.owner.toLowerCase()] || 0,
    }));

    const filtered: MemberListItem[] = search
      ? withCounts.filter((m) =>
          m.owner.toLowerCase().includes(search) ||
          m.delegate.toLowerCase().includes(search),
        )
      : withCounts;

    return NextResponse.json({ members: filtered });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


