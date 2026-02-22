import { NextRequest, NextResponse } from "next/server";
import { getProposalByIdOrNumber } from "@/services/proposals";

export const revalidate = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let proposal;
  try {
    proposal = await getProposalByIdOrNumber(id);
  } catch {
    return new NextResponse("Failed to fetch proposal", { status: 500 });
  }

  if (!proposal) {
    return new NextResponse("Proposal not found", { status: 404 });
  }

  const voteEnd = proposal.endDate
    ? proposal.endDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const quorumReached = totalVotes >= proposal.quorumVotes;

  const md = `# Proposal #${proposal.proposalNumber}: ${proposal.title}

**Status:** ${proposal.status}
**Proposer:** \`${proposal.proposer}\`
**Vote end:** ${voteEnd}

## Votes

| Choice | Count | % |
|--------|-------|---|
| FOR | ${proposal.forVotes} | ${totalVotes > 0 ? ((proposal.forVotes / totalVotes) * 100).toFixed(1) : "0.0"}% |
| AGAINST | ${proposal.againstVotes} | ${totalVotes > 0 ? ((proposal.againstVotes / totalVotes) * 100).toFixed(1) : "0.0"}% |
| ABSTAIN | ${proposal.abstainVotes} | ${totalVotes > 0 ? ((proposal.abstainVotes / totalVotes) * 100).toFixed(1) : "0.0"}% |

**Quorum:** ${proposal.quorumVotes} votes required — ${quorumReached ? "reached" : "not reached"}

---

${proposal.description ?? "_No description provided._"}
`;

  return new NextResponse(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
