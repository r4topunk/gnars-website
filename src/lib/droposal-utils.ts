import { decodeFunctionData, formatEther } from "viem";
import { DROPOSAL_TARGET, ZORA_CREATOR } from "./config";

// Zora NFT Creator ABI - focusing on createEdition function for droposal detection
export const zoraNftCreatorAbi = [
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "symbol", type: "string" },
      { internalType: "uint64", name: "editionSize", type: "uint64" },
      { internalType: "uint16", name: "royaltyBPS", type: "uint16" },
      { internalType: "address payable", name: "fundsRecipient", type: "address" },
      { internalType: "address", name: "defaultAdmin", type: "address" },
      {
        components: [
          { internalType: "uint104", name: "publicSalePrice", type: "uint104" },
          { internalType: "uint32", name: "maxSalePurchasePerAddress", type: "uint32" },
          { internalType: "uint64", name: "publicSaleStart", type: "uint64" },
          { internalType: "uint64", name: "publicSaleEnd", type: "uint64" },
          { internalType: "uint64", name: "presaleStart", type: "uint64" },
          { internalType: "uint64", name: "presaleEnd", type: "uint64" },
          { internalType: "bytes32", name: "presaleMerkleRoot", type: "bytes32" },
        ],
        internalType: "struct IERC721Drop.SalesConfiguration",
        name: "saleConfig",
        type: "tuple",
      },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "string", name: "animationURI", type: "string" },
      { internalType: "string", name: "imageURI", type: "string" },
    ],
    name: "createEdition",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Type definitions for droposal data
export interface DroposalSalesConfig {
  publicSalePrice: bigint;
  maxSalePurchasePerAddress: number;
  publicSaleStart: bigint;
  publicSaleEnd: bigint;
  presaleStart: bigint;
  presaleEnd: bigint;
  presaleMerkleRoot: `0x${string}`;
}

export interface DroposalParams {
  name: string;
  symbol: string;
  editionSize: bigint;
  royaltyBPS: number;
  fundsRecipient: `0x${string}`;
  defaultAdmin: `0x${string}`;
  saleConfig: DroposalSalesConfig;
  description: string;
  animationURI: string;
  imageURI: string;
}

/**
 * Detects if a proposal transaction is a droposal by checking if it targets
 * the Zora EditionCreator contract and calls the createEdition function
 */
export function isDroposal(target: string, calldata?: string): boolean {
  const normalized = target.toLowerCase();
  const matchesZoraCreator = normalized === ZORA_CREATOR.base.toLowerCase();
  const matchesDroposalTarget = normalized === DROPOSAL_TARGET.base.toLowerCase();
  if (!matchesZoraCreator && !matchesDroposalTarget) return false;

  // If no calldata provided, we can only check the target
  if (!calldata) {
    return true;
  }

  try {
    // Check if the calldata matches createEdition function signature
    const decoded = decodeFunctionData({
      abi: zoraNftCreatorAbi,
      data: calldata as `0x${string}`,
    });

    return decoded.functionName === "createEdition";
  } catch {
    // If decoding fails, it's not a droposal
    return false;
  }
}

/**
 * Decodes droposal parameters from transaction calldata
 */
export function decodeDroposalParams(calldata: string): DroposalParams | null {
  try {
    const decoded = decodeFunctionData({
      abi: zoraNftCreatorAbi,
      data: calldata as `0x${string}`,
    });

    if (decoded.functionName !== "createEdition") {
      return null;
    }

    const [
      name,
      symbol,
      editionSize,
      royaltyBPS,
      fundsRecipient,
      defaultAdmin,
      saleConfig,
      description,
      animationURI,
      imageURI,
    ] = decoded.args;

    return {
      name,
      symbol,
      editionSize,
      royaltyBPS,
      fundsRecipient,
      defaultAdmin,
      saleConfig: {
        publicSalePrice: saleConfig.publicSalePrice,
        maxSalePurchasePerAddress: saleConfig.maxSalePurchasePerAddress,
        publicSaleStart: saleConfig.publicSaleStart,
        publicSaleEnd: saleConfig.publicSaleEnd,
        presaleStart: saleConfig.presaleStart,
        presaleEnd: saleConfig.presaleEnd,
        presaleMerkleRoot: saleConfig.presaleMerkleRoot,
      },
      description,
      animationURI,
      imageURI,
    };
  } catch (error) {
    console.error("Failed to decode droposal params:", error);
    return null;
  }
}

/**
 * Formats droposal parameters for display in a table
 */
export function formatDroposalForTable(params: DroposalParams): Array<{
  parameter: string;
  value: string | React.ReactNode;
}> {
  const OPEN_EDITION_SENTINEL = BigInt("18446744073709551615");
  const editionText =
    params.editionSize === BigInt(0) || params.editionSize === OPEN_EDITION_SENTINEL
      ? "Open edition"
      : new Intl.NumberFormat().format(Number(params.editionSize));

  const priceWei = params.saleConfig.publicSalePrice ?? BigInt(0);
  const priceEth = Number(priceWei) === 0 ? "Free" : `${formatEther(priceWei)} ETH`;

  const maxPerAddr =
    params.saleConfig.maxSalePurchasePerAddress && params.saleConfig.maxSalePurchasePerAddress > 0
      ? new Intl.NumberFormat().format(params.saleConfig.maxSalePurchasePerAddress)
      : "Unlimited";

  const startMs = Number(params.saleConfig.publicSaleStart || BigInt(0)) * 1000;
  const endMs = Number(params.saleConfig.publicSaleEnd || BigInt(0)) * 1000;
  const startText = startMs ? new Date(startMs).toLocaleString() : "Not set";
  const endText = endMs ? new Date(endMs).toLocaleString() : "Not set";

  return [
    { parameter: "Name", value: params.name },
    { parameter: "Symbol", value: params.symbol },
    { parameter: "Edition Size", value: editionText },
    { parameter: "Royalty", value: `${(params.royaltyBPS / 100).toFixed(2)}%` },
    { parameter: "Funds Recipient", value: params.fundsRecipient },
    { parameter: "Admin", value: params.defaultAdmin },
    { parameter: "Public Sale Price", value: priceEth },
    { parameter: "Max per Address", value: maxPerAddr },
    { parameter: "Public Sale Start", value: startText },
    { parameter: "Public Sale End", value: endText },
    { parameter: "Description", value: params.description },
    { parameter: "Animation URI", value: params.animationURI || "None" },
    { parameter: "Image URI", value: params.imageURI || "None" },
  ];
}
