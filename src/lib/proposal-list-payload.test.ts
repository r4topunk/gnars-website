import { describe, expect, it } from "vitest";
import type { Proposal } from "@/components/proposals/types";
import { ProposalStatus } from "@/lib/schemas/proposals";
import { toListProposal } from "./proposal-list-payload";

function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    proposalId: "0xabc",
    proposalNumber: 42,
    title: "Fund skate park",
    description: "Some description",
    status: ProposalStatus.EXECUTED,
    proposer: "0x1234567890123456789012345678901234567890",
    createdAt: 1700000000000,
    endBlock: 123,
    forVotes: 10,
    againstVotes: 2,
    abstainVotes: 1,
    quorumVotes: 5,
    calldatas: ["0x"],
    targets: ["0x1234567890123456789012345678901234567890"],
    values: ["0"],
    signatures: [],
    transactionHash: "0xdead",
    votes: [
      {
        voter: "0x1234567890123456789012345678901234567890",
        choice: "FOR",
        votes: "10",
        transactionHash: "0xbeef",
        reason: "long reason text",
      },
    ],
    voteStart: "2023-11-14T00:00:00.000Z",
    voteEnd: "2023-11-18T00:00:00.000Z",
    timeCreated: 1700000000,
    ...overrides,
  };
}

describe("toListProposal", () => {
  it("drops the votes array", () => {
    const slim = toListProposal(makeProposal());
    expect(slim.votes).toBeUndefined();
  });

  it("extracts the first URL from the description as bannerImageUrl", () => {
    const slim = toListProposal(
      makeProposal({
        description: "# Title\n\nIntro text\n\n![banner](https://example.com/pic.png) more",
      }),
    );
    expect(slim.bannerImageUrl).toBe("https://example.com/pic.png");
  });

  it("sets bannerImageUrl to null when the description has no URL", () => {
    const slim = toListProposal(makeProposal({ description: "plain text only" }));
    expect(slim.bannerImageUrl).toBeNull();
  });

  it("strips markdown and truncates the description", () => {
    const body = `# Heading\n\n**bold** text\n\n\`\`\`js\ncode();\n\`\`\`\n\n${"lorem ipsum ".repeat(200)}`;
    const slim = toListProposal(makeProposal({ description: body }));
    expect(slim.description.length).toBeLessThanOrEqual(600);
    expect(slim.description).not.toContain("#");
    expect(slim.description).not.toContain("**");
    expect(slim.description).not.toContain("code()");
    expect(slim.description).toContain("bold text");
  });

  it("keeps fields the cards depend on", () => {
    const proposal = makeProposal();
    const slim = toListProposal(proposal);
    expect(slim.title).toBe(proposal.title);
    expect(slim.forVotes).toBe(proposal.forVotes);
    expect(slim.calldatas).toEqual(proposal.calldatas);
    expect(slim.targets).toEqual(proposal.targets);
    expect(slim.values).toEqual(proposal.values);
    expect(slim.quorumVotes).toBe(proposal.quorumVotes);
  });
});
