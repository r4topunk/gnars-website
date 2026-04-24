export const POIDH_ABI = [
  // ── Write functions ──────────────────────────────────────────────────────
  {
    "inputs": [
      { "internalType": "uint256", "name": "bountyId",    "type": "uint256" },
      { "internalType": "string",  "name": "name",        "type": "string"  },
      { "internalType": "string",  "name": "description", "type": "string"  },
      { "internalType": "string",  "name": "imageUri",    "type": "string"  }
    ],
    "name": "createClaim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "name",        "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" }
    ],
    "name": "createSoloBounty",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "name",        "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" }
    ],
    "name": "createOpenBounty",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "bountyId", "type": "uint256" }],
    "name": "joinOpenBounty",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "bountyId", "type": "uint256" },
      { "internalType": "uint256", "name": "claimId",  "type": "uint256" }
    ],
    "name": "acceptClaim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "bountyId", "type": "uint256" },
      { "internalType": "uint256", "name": "claimId",  "type": "uint256" }
    ],
    "name": "submitClaimForVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "bountyId", "type": "uint256" },
      { "internalType": "bool",    "name": "vote",     "type": "bool"    }
    ],
    "name": "voteClaim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "bountyId", "type": "uint256" }],
    "name": "resolveVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "bountyId", "type": "uint256" }],
    "name": "cancelSoloBounty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "bountyId", "type": "uint256" }],
    "name": "cancelOpenBounty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "bountyId", "type": "uint256" }],
    "name": "withdrawFromOpenBounty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "bountyId", "type": "uint256" }],
    "name": "claimRefundFromCancelledOpenBounty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "bountyId", "type": "uint256" }],
    "name": "resetVotingPeriod",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "to", "type": "address" }],
    "name": "withdrawTo",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // ── Read functions ───────────────────────────────────────────────────────
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "bounties",
    "outputs": [
      { "internalType": "string",  "name": "name",        "type": "string"  },
      { "internalType": "string",  "name": "description", "type": "string"  },
      { "internalType": "uint256", "name": "amount",      "type": "uint256" },
      { "internalType": "address", "name": "issuer",      "type": "address" },
      { "internalType": "address", "name": "claimer",     "type": "address" },
      { "internalType": "uint256", "name": "createdAt",   "type": "uint256" },
      { "internalType": "uint256", "name": "claimId",     "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "bountyId", "type": "uint256" }],
    "name": "getParticipants",
    "outputs": [
      { "internalType": "address[]", "name": "", "type": "address[]" },
      { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "bountyId", "type": "uint256" }],
    "name": "bountyVotingTracker",
    "outputs": [
      { "internalType": "uint256", "name": "yes",      "type": "uint256" },
      { "internalType": "uint256", "name": "no",       "type": "uint256" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "bountyId", "type": "uint256" }],
    "name": "bountyCurrentVotingClaim",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "bountyId", "type": "uint256" }],
    "name": "everHadExternalContributor",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "pendingWithdrawals",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
