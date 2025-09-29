export const gnarsGovernorAbi = [
  {
    type: "function",
    name: "castVote",
    inputs: [
      { name: "_proposalId", type: "bytes32", internalType: "bytes32" },
      { name: "_support", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "castVoteWithReason",
    inputs: [
      { name: "_proposalId", type: "bytes32", internalType: "bytes32" },
      { name: "_support", type: "uint256", internalType: "uint256" },
      { name: "_reason", type: "string", internalType: "string" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "proposalVotes",
    inputs: [
      { name: "_proposalId", type: "bytes32", internalType: "bytes32" },
      { name: "_voter", type: "address", internalType: "address" },
    ],
    outputs: [
      {
        components: [
          { name: "againstVotes", type: "uint256", internalType: "uint256" },
          { name: "forVotes", type: "uint256", internalType: "uint256" },
          { name: "abstainVotes", type: "uint256", internalType: "uint256" },
        ],
        name: "",
        type: "tuple",
        internalType: "struct IGovVotesProposer.State",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasVoted",
    inputs: [
      { name: "_proposalId", type: "bytes32", internalType: "bytes32" },
      { name: "_voter", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "state",
    inputs: [{ name: "_proposalId", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "uint8", internalType: "enum IGov.State" }],
    stateMutability: "view",
  },
] as const;

export type GnarsGovernorAbi = typeof gnarsGovernorAbi;

