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
import {
  DAO_ADDRESSES,
  DROPOSAL_TARGET,
  GNARS_ADDRESSES_ETH,
  TREASURY_TOKEN_ALLOWLIST,
} from "@/lib/config";
import { type TransactionFormValues } from "../schema";
import { getRecipient, RecipientBundleCard } from "./RecipientBundleCard";
import { TransactionVisualization } from "./TransactionVisualization";

// Ethereum mainnet USDC address (different from Base USDC)
const USDC_ETH_MAINNET = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

// Function selectors for prepending to selector-less calldatas
const TRANSFER_SELECTOR = "0xa9059cbb" as const; // transfer(address,uint256)
const TRANSFER_FROM_SELECTOR = "0x23b872dd" as const; // transferFrom(address,address,uint256)

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
  [USDC_ETH_MAINNET.toLowerCase()]: 6,
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

/**
 * Check if a calldata is missing its function selector.
 * The Nouns protocol subgraph stores calldatas WITHOUT selectors (just ABI-encoded params).
 * We detect this when the first 4 bytes are zeros (0x00000000) - not a valid selector.
 */
function isSelectorLess(calldata: Hex | null): boolean {
  if (!calldata || calldata.length < 10) return false;
  return calldata.slice(2, 10) === "00000000";
}

/**
 * For selector-less calldatas, prepend the correct function selector
 * based on target address and parameter structure.
 */
function reconstructCalldata(target: string, calldata: Hex): Hex | null {
  const normalizedTarget = target.toLowerCase();
  const paramBytes = (calldata.length - 2) / 2; // hex chars to bytes

  // Target is a known ERC-20 (USDC, etc.) + 64 bytes of params = transfer(address,uint256)
  const isKnownErc20 =
    normalizedTarget === USDC_ETH_MAINNET.toLowerCase() ||
    normalizedTarget === TREASURY_TOKEN_ALLOWLIST.USDC.toLowerCase();

  if (isKnownErc20 && paramBytes === 64) {
    return `${TRANSFER_SELECTOR}${calldata.slice(2)}` as Hex;
  }

  // Target is an NFT contract + 96 bytes = transferFrom(address,address,uint256)
  const isNftContract =
    normalizedTarget === DAO_ADDRESSES.token.toLowerCase() ||
    normalizedTarget === GNARS_ADDRESSES_ETH.token.toLowerCase();

  if (isNftContract && paramBytes === 96) {
    return `${TRANSFER_FROM_SELECTOR}${calldata.slice(2)}` as Hex;
  }

  return null;
}

function determineTransactionType(
  target: string,
  signature: string,
  calldata: Hex | null,
  rawValue: string | number,
): TransactionType {
  const normalizedTarget = target.toLowerCase();
  const trimmedSignature = signature?.trim();
  const isEthTransfer = !calldata || calldata === "0x";

  if (normalizedTarget === DROPOSAL_TARGET.base.toLowerCase()) {
    return "droposal";
  }

  if (isEthTransfer) {
    return toBigInt(rawValue) > 0n ? "send-eth" : "custom";
  }

  // Handle selector-less calldatas from Nouns protocol subgraph
  let effectiveCalldata = calldata;
  if (isSelectorLess(calldata)) {
    const reconstructed = reconstructCalldata(target, calldata!);
    if (reconstructed) {
      effectiveCalldata = reconstructed;
    }
  }

  const selector =
    effectiveCalldata && effectiveCalldata.length >= 10
      ? effectiveCalldata.slice(0, 10).toLowerCase()
      : null;

  if (selector === "0xa9059cbb") {
    if (
      normalizedTarget === TREASURY_TOKEN_ALLOWLIST.USDC.toLowerCase() ||
      normalizedTarget === USDC_ETH_MAINNET.toLowerCase()
    )
      return "send-usdc";
    return "send-tokens";
  }

  if (selector === "0x23b872dd" || selector === "0x42842e0e" || selector === "0xb88d4fde") {
    if (
      normalizedTarget === DAO_ADDRESSES.token.toLowerCase() ||
      normalizedTarget === GNARS_ADDRESSES_ETH.token.toLowerCase()
    )
      return "send-nfts";
    return "custom";
  }

  const methodName = trimmedSignature?.split("(")[0]?.toLowerCase();
  if (methodName === "createedition") return "droposal";
  if (methodName === "transfer") {
    if (normalizedTarget === TREASURY_TOKEN_ALLOWLIST.USDC.toLowerCase()) return "send-usdc";
    return "send-tokens";
  }
  if (methodName === "safetransferfrom" || methodName === "transferfrom") {
    if (normalizedTarget === DAO_ADDRESSES.token.toLowerCase()) return "send-nfts";
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

const SAFE_TRANSFER_FROM_SELECTOR = "0x42842e0e" as const;

function decodeErc721Transfer(
  abi: typeof ERC721_TRANSFER_FROM_ABI | typeof ERC721_SAFE_TRANSFER_FROM_ABI,
  calldata: Hex,
): { from: Address; to: Address; tokenId: bigint } | null {
  const selector = calldata.slice(0, 10).toLowerCase();
  const isTransferFrom = abi === ERC721_TRANSFER_FROM_ABI;
  const expected = isTransferFrom ? TRANSFER_FROM_SELECTOR : SAFE_TRANSFER_FROM_SELECTOR;
  if (selector !== expected) return null;
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

  // Reconstruct calldata with selector if needed (for Nouns protocol subgraph)
  let decodableCalldata = calldata;
  if (calldata && isSelectorLess(calldata)) {
    const reconstructed = reconstructCalldata(target, calldata);
    if (reconstructed) decodableCalldata = reconstructed;
  }

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
      const decoded = decodableCalldata ? decodeErc20Transfer(decodableCalldata) : null;
      return {
        ...baseTransaction,
        tokenAddress: target,
        recipient: decoded?.to ?? "",
        amount: decoded ? formatUnits(decoded.amount, 6) : "0",
      } as TransactionFormValues;
    }

    case "send-tokens": {
      const decoded = decodableCalldata ? decodeErc20Transfer(decodableCalldata) : null;
      const amount = decoded ? formatTokenAmount(target, decoded.amount) : formatEther(valueBigInt);
      return {
        ...baseTransaction,
        tokenAddress: target,
        recipient: decoded?.to && isAddress(decoded.to) ? decoded.to : "",
        amount,
      } as TransactionFormValues;
    }

    case "send-nfts": {
      const decoded = decodableCalldata
        ? decodeErc721Transfer(ERC721_SAFE_TRANSFER_FROM_ABI, decodableCalldata) ||
          decodeErc721Transfer(ERC721_TRANSFER_FROM_ABI, decodableCalldata)
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
  /** Optional human-readable descriptions for each transaction */
  descriptions?: string[];
}

export function ProposalTransactionVisualization({
  targets,
  values,
  signatures,
  calldatas,
  descriptions,
}: ProposalTransactionVisualizationProps) {
  if (targets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">No transaction calls attached.</div>
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

  // Parse all transactions
  const parsedTransactions = targets.map((target, index) => {
    const calldata = normalizeHex(calldatas[index]);
    const transaction = mapProposalTransaction(
      target,
      values[index] || 0,
      signatures[index] || "",
      calldata,
      index,
    );
    const typeInfo =
      transactionTypes.find((t) => t.type === transaction.type) || transactionTypes[5];
    return { transaction, typeInfo, index, description: descriptions?.[index] };
  });

  // Group ALL transferable txs by recipient (regardless of order)
  const transferableTypes = new Set(["send-eth", "send-usdc", "send-tokens", "send-nfts"]);

  type ParsedTx = (typeof parsedTransactions)[number];
  type RenderItem =
    | { kind: "single"; tx: ParsedTx }
    | { kind: "bundle"; txs: ParsedTx[]; recipient: string; from: string };

  // Collect transferable txs by recipient
  const recipientGroups = new Map<string, ParsedTx[]>();
  const recipientOrder: string[] = [];

  for (const parsed of parsedTransactions) {
    const recipient = getRecipient(parsed.transaction);
    if (transferableTypes.has(parsed.transaction.type) && recipient) {
      if (!recipientGroups.has(recipient)) {
        recipientGroups.set(recipient, []);
        recipientOrder.push(recipient);
      }
      recipientGroups.get(recipient)!.push(parsed);
    }
  }

  // Track which txs are bundled (2+ txs to same recipient)
  const bundledIndices = new Set<number>();
  for (const [, group] of recipientGroups) {
    if (group.length > 1) {
      for (const tx of group) bundledIndices.add(tx.index);
    }
  }

  // Build render items: bundles appear at the position of the first tx in the group
  const renderItems: RenderItem[] = [];
  const emittedRecipients = new Set<string>();

  for (const parsed of parsedTransactions) {
    if (bundledIndices.has(parsed.index)) {
      const recipient = getRecipient(parsed.transaction)!;
      if (!emittedRecipients.has(recipient)) {
        emittedRecipients.add(recipient);
        const group = recipientGroups.get(recipient)!;
        const nftTx = group.find((g) => g.transaction.type === "send-nfts");
        const from = nftTx && nftTx.transaction.type === "send-nfts" ? nftTx.transaction.from : "";
        renderItems.push({ kind: "bundle", txs: group, recipient, from });
      }
      // Skip — already emitted as part of a bundle
    } else {
      renderItems.push({ kind: "single", tx: parsed });
    }
  }

  return (
    <div className="space-y-4">
      {renderItems.map((item, renderIndex) => {
        if (item.kind === "bundle") {
          return (
            <RecipientBundleCard
              key={`bundle-${renderIndex}`}
              recipient={item.recipient}
              from={item.from}
              transactions={item.txs.map((t) => t.transaction)}
              indices={item.txs.map((t) => t.index)}
            />
          );
        }

        const { transaction, typeInfo, index, description } = item.tx;

        return (
          <div key={index} className="space-y-0">
            <TransactionVisualization
              index={index}
              transaction={transaction}
              label={typeInfo.label}
              icon={typeInfo.icon}
            />
            {description && (
              <div className="mx-4 -mt-1 mb-2 px-3 py-1.5 rounded-b-lg bg-muted/50 border border-t-0 border-border/50 text-xs text-muted-foreground">
                {description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
