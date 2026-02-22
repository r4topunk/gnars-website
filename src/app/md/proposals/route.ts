import { NextResponse } from "next/server";
import { listProposals } from "@/services/proposals";
import { ProposalStatus } from "@/lib/schemas/proposals";

export const revalidate = 60;

const ORDER: ProposalStatus[] = [
  ProposalStatus.ACTIVE,
  ProposalStatus.PENDING,
  ProposalStatus.SUCCEEDED,
  ProposalStatus.QUEUED,
  ProposalStatus.EXECUTED,
  ProposalStatus.DEFEATED,
  ProposalStatus.CANCELLED,
  ProposalStatus.VETOED,
  ProposalStatus.EXPIRED,
];

export async function GET() {
  let proposals;
  try {
    proposals = await listProposals(200, 0);
  } catch (e) {
    return new NextResponse(`Failed to fetch proposals: ${String(e)}`, { status: 500 });
  }

  const groups = new Map<ProposalStatus, typeof proposals>();
  for (const status of ORDER) groups.set(status, []);

  for (const p of proposals) {
    const bucket = groups.get(p.status as ProposalStatus);
    if (bucket) bucket.push(p);
  }

  let md = `# Gnars Proposals\n\nCommunity governance for Gnars DAO on Base.\n\n`;

  for (const status of ORDER) {
    const list = groups.get(status);
    if (!list || list.length === 0) continue;

    md += `## ${status}\n\n`;
    for (const p of list) {
      md += `- [#${p.proposalNumber}: ${p.title}](/proposals/${p.proposalNumber})`;
      if (status === ProposalStatus.ACTIVE) {
        md += ` — FOR: ${p.forVotes} | AGAINST: ${p.againstVotes} | ABSTAIN: ${p.abstainVotes}`;
      }
      md += "\n";
    }
    md += "\n";
  }

  return new NextResponse(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
