import { z } from "zod";
import { createWalletClient, createPublicClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const GOVERNOR_ADDRESS = "0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c" as const;
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";

const SUPPORT_MAP = {
  AGAINST: 0n,
  FOR: 1n,
  ABSTAIN: 2n,
} as const;

const CAST_VOTE_ABI = [
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
] as const;

export const castVoteSchema = z.object({
  proposalId: z
    .union([z.string(), z.number()])
    .describe("Proposal ID (hex string starting with 0x) or proposal number"),
  support: z
    .enum(["FOR", "AGAINST", "ABSTAIN"])
    .describe("Vote choice: FOR, AGAINST, or ABSTAIN"),
  reason: z
    .string()
    .optional()
    .describe("Optional reason for the vote (will be stored on-chain)"),
});

export type CastVoteInput = z.infer<typeof castVoteSchema>;

export interface CastVoteOutput {
  success: boolean;
  transactionHash: string;
  voter: string;
  proposalId: string;
  support: string;
  reason?: string;
  blockNumber?: string;
}

async function resolveProposalId(id: string | number): Promise<Hex> {
  if (typeof id === "number" || (typeof id === "string" && !id.startsWith("0x"))) {
    // Need to fetch proposal hex ID from subgraph
    const { subgraphClient } = await import("../subgraph/client.js");
    const proposal = await subgraphClient.fetchProposalByNumber(
      typeof id === "string" ? parseInt(id, 10) : id
    );
    if (!proposal) {
      throw new Error(`Proposal #${id} not found`);
    }
    return proposal.proposalId as Hex;
  }
  return id as Hex;
}

export async function castVote(input: CastVoteInput): Promise<CastVoteOutput> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "PRIVATE_KEY environment variable is required to cast votes. " +
        "Set it in your .mcp.json env configuration."
    );
  }

  const formattedKey = privateKey.startsWith("0x")
    ? (privateKey as Hex)
    : (`0x${privateKey}` as Hex);

  const account = privateKeyToAccount(formattedKey);

  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  const proposalId = await resolveProposalId(input.proposalId);
  const support = SUPPORT_MAP[input.support];
  const trimmedReason = input.reason?.trim();

  let txHash: Hex;

  if (trimmedReason && trimmedReason.length > 0) {
    txHash = await walletClient.writeContract({
      account,
      abi: CAST_VOTE_ABI,
      address: GOVERNOR_ADDRESS,
      functionName: "castVoteWithReason",
      args: [proposalId, support, trimmedReason],
      chain: base,
    });
  } else {
    txHash = await walletClient.writeContract({
      account,
      abi: CAST_VOTE_ABI,
      address: GOVERNOR_ADDRESS,
      functionName: "castVote",
      args: [proposalId, support],
      chain: base,
    });
  }

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 60_000,
  });

  return {
    success: receipt.status === "success",
    transactionHash: txHash,
    voter: account.address,
    proposalId,
    support: input.support,
    reason: trimmedReason || undefined,
    blockNumber: receipt.blockNumber.toString(),
  };
}
