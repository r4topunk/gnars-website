// Auction ABI for bidding, reading, and settling auctions
// Includes: auction() view, createBid(uint256) payable, settlement functions

const auctionAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "auction",
    inputs: [],
    outputs: [
      { name: "tokenId", type: "uint256" },
      { name: "highestBid", type: "uint256" },
      { name: "highestBidder", type: "address" },
      { name: "startTime", type: "uint40" },
      { name: "endTime", type: "uint40" },
      { name: "settled", type: "bool" },
    ],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "createBid",
    inputs: [{ name: "_tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "settleAuction",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "settleCurrentAndCreateNewAuction",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "paused",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "reservePrice",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "duration",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "minBidIncrement",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "AuctionBid",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: false },
      { name: "bidder", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "extended", type: "bool", indexed: false },
      { name: "endTime", type: "uint256", indexed: false },
    ],
  },
] as const;

export default auctionAbi;


