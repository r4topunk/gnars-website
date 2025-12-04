// Zora NFT Drop ABI for minting/purchasing NFTs
// Based on Zora's ERC721Drop contract interface with Protocol Rewards

// Protocol reward fee per token (0.000777 ETH)
export const ZORA_PROTOCOL_REWARD = 0.000777;

export const zoraNftMintAbi = [
  // Legacy purchase function - requires protocol reward added to value
  {
    type: "function",
    name: "purchase",
    stateMutability: "payable",
    inputs: [{ name: "quantity", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Legacy purchase with comment
  {
    type: "function",
    name: "purchaseWithComment",
    stateMutability: "payable",
    inputs: [
      { name: "quantity", type: "uint256" },
      { name: "comment", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Modern mint with rewards - preferred method
  {
    type: "function",
    name: "mintWithRewards",
    stateMutability: "payable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "quantity", type: "uint256" },
      { name: "comment", type: "string" },
      { name: "mintReferral", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Compute total reward for quantity
  {
    type: "function",
    name: "computeTotalReward",
    stateMutability: "view",
    inputs: [{ name: "numTokens", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Sale details
  {
    type: "function",
    name: "saleDetails",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        components: [
          { name: "publicSaleActive", type: "bool" },
          { name: "presaleActive", type: "bool" },
          { name: "publicSalePrice", type: "uint256" },
          { name: "publicSaleStart", type: "uint64" },
          { name: "publicSaleEnd", type: "uint64" },
          { name: "presaleStart", type: "uint64" },
          { name: "presaleEnd", type: "uint64" },
          { name: "presaleMerkleRoot", type: "bytes32" },
          { name: "maxSalePurchasePerAddress", type: "uint256" },
          { name: "totalMinted", type: "uint256" },
          { name: "maxSupply", type: "uint256" },
        ],
        name: "saleDetails",
        type: "tuple",
      },
    ],
  },
  // Total supply
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "supply", type: "uint256" }],
  },
  // Owner of token
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }],
  },
] as const;

export default zoraNftMintAbi;
