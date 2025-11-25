import type { SubgraphProposal, SubgraphVote } from "../../src/subgraph/types.js";

export const mockProposal: SubgraphProposal = {
  id: "0x2ff7852a23e408cb6b7ba5c89384672eb88dab2e-0x1234567890abcdef",
  proposalId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  proposalNumber: 42,
  title: "Sponsor Skater X for Olympics",
  description:
    "## Summary\n\nThis proposal requests 5 ETH to sponsor our beloved skater for the upcoming Olympics.\n\n## Details\n\n- Travel expenses: 2 ETH\n- Equipment: 1.5 ETH\n- Training costs: 1.5 ETH",
  proposer: "0xabcdef1234567890abcdef1234567890abcdef12",
  timeCreated: "1700000000",
  voteStart: "1700086400",
  voteEnd: "1700691200",
  snapshotBlockNumber: "12345678",
  forVotes: "10",
  againstVotes: "5",
  abstainVotes: "2",
  quorumVotes: "8",
  executed: false,
  canceled: false,
  vetoed: false,
  queued: false,
  transactionHash: "0xtxhash1234567890",
};

export const mockProposalExecuted: SubgraphProposal = {
  ...mockProposal,
  id: "0x2ff7852a23e408cb6b7ba5c89384672eb88dab2e-0xexecuted",
  proposalId: "0xexecuted1234567890abcdef1234567890abcdef1234567890abcdef12345678",
  proposalNumber: 38,
  title: "Community Treasury Allocation",
  description: "Allocate funds for community events",
  executed: true,
  forVotes: "50",
  againstVotes: "10",
  abstainVotes: "5",
};

export const mockProposalDefeated: SubgraphProposal = {
  ...mockProposal,
  id: "0x2ff7852a23e408cb6b7ba5c89384672eb88dab2e-0xdefeated",
  proposalId: "0xdefeated1234567890abcdef1234567890abcdef1234567890abcdef12345678",
  proposalNumber: 35,
  title: "Rejected Proposal",
  description: "This proposal was rejected by the community",
  canceled: false,
  executed: false,
  forVotes: "5",
  againstVotes: "25",
  abstainVotes: "3",
};

export const mockVotes: SubgraphVote[] = [
  {
    id: "0x1234-vote-1",
    voter: "0x1111111111111111111111111111111111111111",
    support: 1, // FOR
    weight: "5",
    reason: "Great proposal! Love supporting our athletes.",
    timestamp: "1700100000",
    transactionHash: "0xvote1hash",
    proposal: {
      proposalNumber: 42,
      title: "Sponsor Skater X for Olympics",
    },
  },
  {
    id: "0x1234-vote-2",
    voter: "0x2222222222222222222222222222222222222222",
    support: 1, // FOR
    weight: "3",
    reason: null,
    timestamp: "1700100100",
    transactionHash: "0xvote2hash",
    proposal: {
      proposalNumber: 42,
      title: "Sponsor Skater X for Olympics",
    },
  },
  {
    id: "0x1234-vote-3",
    voter: "0x3333333333333333333333333333333333333333",
    support: 0, // AGAINST
    weight: "4",
    reason: "Budget concerns - we should save for bigger opportunities",
    timestamp: "1700100200",
    transactionHash: "0xvote3hash",
    proposal: {
      proposalNumber: 42,
      title: "Sponsor Skater X for Olympics",
    },
  },
  {
    id: "0x1234-vote-4",
    voter: "0x4444444444444444444444444444444444444444",
    support: 2, // ABSTAIN
    weight: "2",
    reason: "Need more information",
    timestamp: "1700100300",
    transactionHash: "0xvote4hash",
    proposal: {
      proposalNumber: 42,
      title: "Sponsor Skater X for Olympics",
    },
  },
];

export const mockProposalsResponse = {
  data: {
    proposals: [mockProposal, mockProposalExecuted, mockProposalDefeated],
  },
};

export const mockVotesResponse = {
  data: {
    proposalVotes: mockVotes,
  },
};
