"use client";

import { Coins, FileImage, Send, Settings, Zap } from "lucide-react";
import {
  decodeFunctionData,
  formatEther,
  formatUnits,
  isAddress,
  isHex,
  type Address,
  type Hex,
} from "viem";
import { TransactionVisualization } from "./TransactionVisualization";
import { type TransactionFormValues } from "../schema";
import {
  DROPOSAL_TARGET,
  GNARS_ADDRESSES,
  TREASURY_TOKEN_ALLOWLIST,
} from "@/lib/config";

type TransactionType = TransactionFormValues["type"];

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const ERC721_TRANSFER_FROM_ABI = [
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const ERC721_SAFE_TRANSFER_FROM_ABI = [
  {
    type: "function",
    name: "safeTransferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const DROPOSAL_CREATE_EDITION_ABI = [
  {
    type: "function",
    name: "createEdition",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "editionSize", type: "uint64" },
      { name: "royaltyBPS", type: "uint16" },
      { name: "fundsRecipient", type: "address" },
      { name: "defaultAdmin", type: "address" },
      {
        name: "saleConfig",
        type: "tuple",
        components: [
          { name: "publicSalePrice", type: "uint104" },
          { name: "maxSalePurchasePerAddress", type: "uint32" },
          { name: "publicSaleStart", type: "uint64" },
          { name: "publicSaleEnd", type: "uint64" },
          { name: "presaleStart", type: "uint64" },
          { name: "presaleEnd", type: "uint64" },
          { name: "presaleMerkleRoot", type: "bytes32" },
        ],
      },
      { name: "description", type: "string" },
      { name: "animationURI", type: "string" },
      { name: "imageURI", type: "string" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const TOKEN_DECIMALS: Record<string, number> = {
  [TREASURY_TOKEN_ALLOWLIST.USDC.toLowerCase()]: 6,
  [TREASURY_TOKEN_ALLOWLIST.WETH.toLowerCase()]: 18,
  [TREASURY_TOKEN_ALLOWLIST.SENDIT.toLowerCase()]: 18,
};

function normalizeHex(data?: string): Hex | null {
  if (!data) return null;
  if (data === "0x") return "0x";
  const prefixed = data.startsWith("0x") ? data : `0x${data}`;
  return isHex(prefixed) ? (prefixed as Hex) : null;
}

function toBigInt(value: string | number | undefined): bigint {
  if (!value) return 0n;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (value.startsWith("0x")) return BigInt(value as Hex);
  try {
    return BigInt(value);
  } catch (error) {
    console.warn("[ProposalTransactionVisualization] Failed to convert value to bigint", {
      value,
      error,
    });
    return 0n;
  }
}

function determineTransactionType(
  target: string,
  signature: string,
  calldata: Hex | null,
  rawValue: string | number,
): TransactionType {
  const normalizedTarget = target.toLowerCase();
  const trimmedSignature = signature?.trim();
  const selector = calldata && calldata.length >= 10 ? calldata.slice(0, 10).toLowerCase() : null;
  const isEthTransfer = !calldata || calldata === "0x";

  if (normalizedTarget === DROPOSAL_TARGET.base.toLowerCase()) {
    return "droposal";
  }

  if (isEthTransfer) {
    return toBigInt(rawValue) > 0n ? "send-eth" : "custom";
  }

  if (selector === "0xa9059cbb") {
    if (normalizedTarget === TREASURY_TOKEN_ALLOWLIST.USDC.toLowerCase()) return "send-usdc";
    return "send-tokens";
  }

  if (selector === "0x23b872dd" || selector === "0x42842e0e" || selector === "0xb88d4fde") {
    if (normalizedTarget === GNARS_ADDRESSES.token.toLowerCase()) return "send-nfts";
    return "custom";
  }

  const methodName = trimmedSignature?.split("(")[0]?.toLowerCase();
  if (methodName === "createedition") return "droposal";
  if (methodName === "transfer") {
    if (normalizedTarget === TREASURY_TOKEN_ALLOWLIST.USDC.toLowerCase()) return "send-usdc";
    return "send-tokens";
  }
  if (methodName === "safetransferfrom" || methodName === "transferfrom") {
    if (normalizedTarget === GNARS_ADDRESSES.token.toLowerCase()) return "send-nfts";
    return "custom";
  }

  return "custom";
}

function decodeErc20Transfer(calldata: Hex): { to: Address; amount: bigint } | null {
  try {
    const { args } = decodeFunctionData({ abi: ERC20_TRANSFER_ABI, data: calldata });
    const [to, amount] = args as [Address, bigint];
    return { to, amount };
  } catch (error) {
    console.warn("[ProposalTransactionVisualization] Failed to decode ERC20 transfer", {
      calldata,
      error,
    });
    return null;
  }
}

function decodeErc721Transfer(
  abi: typeof ERC721_TRANSFER_FROM_ABI | typeof ERC721_SAFE_TRANSFER_FROM_ABI,
  calldata: Hex,
): { from: Address; to: Address; tokenId: bigint } | null {
  try {
    const { args } = decodeFunctionData({ abi, data: calldata });
    const [from, to, tokenId] = args as [Address, Address, bigint];
    return { from, to, tokenId };
  } catch (error) {
    console.warn("[ProposalTransactionVisualization] Failed to decode ERC721 transfer", {
      calldata,
      error,
    });
    return null;
  }
}

function decodeDroposal(calldata: Hex) {
  try {
    const { args } = decodeFunctionData({ abi: DROPOSAL_CREATE_EDITION_ABI, data: calldata });
    const [
      name,
      symbol,
      editionSize,
      royaltyBps,
      fundsRecipient,
      defaultAdmin,
      saleConfig,
      collectionDescription,
      animationURI,
      imageURI,
    ] = args as [
      string,
      string,
      bigint,
      number,
      Address,
      Address,
      {
        publicSalePrice: bigint;
        maxSalePurchasePerAddress: number;
        publicSaleStart: bigint;
        publicSaleEnd: bigint;
        presaleStart: bigint;
        presaleEnd: bigint;
        presaleMerkleRoot: `0x${string}`;
      },
      string,
      string,
      string,
    ];

    return {
      name,
      symbol,
      editionSize: editionSize.toString(),
      royaltyBps,
      fundsRecipient,
      defaultAdmin,
      saleConfig,
      collectionDescription,
      animationURI,
      imageURI,
    };
  } catch (error) {
    console.warn("[ProposalTransactionVisualization] Failed to decode droposal calldata", {
      calldata,
      error,
    });
    return null;
  }
}

function formatTokenAmount(target: string, amount: bigint): string {
  const decimals = TOKEN_DECIMALS[target.toLowerCase()] ?? 18;
  return formatUnits(amount, decimals);
}

// Map proposal transaction data to TransactionFormValues format
function mapProposalTransaction(
  target: string,
  rawValue: string | number,
  signature: string,
  calldata: Hex | null,
  index: number,
): TransactionFormValues {
  const type = determineTransactionType(target, signature, calldata, rawValue);
  const valueBigInt = toBigInt(rawValue);

  const baseTransaction = {
    type,
    id: `proposal-tx-${index}`,
    rawCalldata: calldata ?? "0x",
  } as const;

  switch (type) {
    case "send-eth": {
      return {
        ...baseTransaction,
        target,
        value: formatEther(valueBigInt),
      } as TransactionFormValues;
    }

    case "send-usdc": {
      const decoded = calldata ? decodeErc20Transfer(calldata) : null;
      return {
        ...baseTransaction,
        tokenAddress: target,
        recipient: decoded?.to ?? "",
        amount: decoded ? formatUnits(decoded.amount, 6) : "0",
      } as TransactionFormValues;
    }

    case "send-tokens": {
      const decoded = calldata ? decodeErc20Transfer(calldata) : null;
      const amount = decoded ? formatTokenAmount(target, decoded.amount) : formatEther(valueBigInt);
      return {
        ...baseTransaction,
        tokenAddress: target,
        recipient: decoded?.to && isAddress(decoded.to) ? decoded.to : "",
        amount,
      } as TransactionFormValues;
    }

    case "send-nfts": {
      const decoded = calldata
        ? decodeErc721Transfer(ERC721_SAFE_TRANSFER_FROM_ABI, calldata) ||
          decodeErc721Transfer(ERC721_TRANSFER_FROM_ABI, calldata)
        : null;
      return {
        ...baseTransaction,
        contractAddress: target,
        tokenId: decoded ? decoded.tokenId.toString() : "0",
        from: decoded?.from ?? "",
        to: decoded?.to ?? "",
      } as TransactionFormValues;
    }

    case "droposal": {
      const decoded = calldata ? decodeDroposal(calldata) : null;
      return {
        ...baseTransaction,
        name: decoded?.name ?? "",
        symbol: decoded?.symbol ?? "",
        collectionDescription: decoded?.collectionDescription ?? "",
        mediaUrl: decoded?.animationURI ?? "",
        animationUri: decoded?.animationURI ?? "",
        imageUri: decoded?.imageURI ?? "",
        price: decoded?.saleConfig ? formatEther(decoded.saleConfig.publicSalePrice) : "0",
        editionType: "fixed",
        payoutAddress: decoded?.fundsRecipient ?? "",
        defaultAdmin: decoded?.defaultAdmin ?? "",
      } as TransactionFormValues;
    }

    case "custom":
    default: {
      const normalizedCalldata = calldata ?? "0x";
      return {
        ...baseTransaction,
        target,
        calldata: normalizedCalldata,
        value: formatEther(valueBigInt),
      } as TransactionFormValues;
    }
  }
}

interface ProposalTransactionVisualizationProps {
  targets: string[];
  values: (string | number)[];
  signatures: string[];
  calldatas: string[];
}

export function ProposalTransactionVisualization({
  targets,
  values,
  signatures,
  calldatas,
}: ProposalTransactionVisualizationProps) {
  if (targets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No transaction calls attached.
      </div>
    );
  }

  const transactionTypes = [
    {
      type: "send-eth",
      label: "Send ETH",
      icon: Send,
    },
    {
      type: "send-usdc",
      label: "Send USDC",
      icon: Coins,
    },
    {
      type: "send-tokens",
      label: "Send Tokens",
      icon: Coins,
    },
    {
      type: "send-nfts",
      label: "Send NFTs",
      icon: FileImage,
    },
    {
      type: "droposal",
      label: "Create Droposal",
      icon: Zap,
    },
    {
      type: "custom",
      label: "Custom Transaction",
      icon: Settings,
    },
  ] as const;

  return (
    <div className="space-y-4">
      {targets.map((target, index) => {
        const calldata = normalizeHex(calldatas[index]);
        const transaction = mapProposalTransaction(
          target,
          values[index] || 0,
          signatures[index] || "",
          calldata,
          index,
        );

        const typeInfo = transactionTypes.find((t) => t.type === transaction.type) || transactionTypes[5];

        return (
          <TransactionVisualization
            key={index}
            index={index}
            transaction={transaction}
            label={typeInfo.label}
            icon={typeInfo.icon}
          />
        );
      })}
    </div>
  );
}
