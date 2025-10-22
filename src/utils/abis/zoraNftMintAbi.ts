// Zora NFT Drop ABI for minting/purchasing NFTs
// Based on Zora's ERC721Drop contract interface

export const zoraNftMintAbi = [
  {
    type: "function",
    name: "purchase",
    stateMutability: "payable",
    inputs: [
      { name: "quantity", type: "uint256" }
    ],
    outputs: [],
  },
  {
    type: "function", 
    name: "purchaseWithComment",
    stateMutability: "payable",
    inputs: [
      { name: "quantity", type: "uint256" },
      { name: "comment", type: "string" }
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "saleDetails",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        components: [
          { name: "publicSaleActive", type: "bool" },
          { name: "publicSalePrice", type: "uint104" },
          { name: "publicSaleStart", type: "uint64" },
          { name: "publicSaleEnd", type: "uint64" },
          { name: "publicSaleMintLimit", type: "uint64" },
          { name: "presaleStart", type: "uint64" },
          { name: "presaleEnd", type: "uint64" },
          { name: "presaleMerkleRoot", type: "bytes32" },
          { name: "maxSalePurchasePerAddress", type: "uint64" },
          { name: "totalMinted", type: "uint64" },
          { name: "maxSupply", type: "uint64" }
        ],
        name: "saleDetails",
        type: "tuple"
      }
    ]
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view", 
    inputs: [],
    outputs: [{ name: "supply", type: "uint256" }]
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }]
  }
] as const;

export default zoraNftMintAbi;
