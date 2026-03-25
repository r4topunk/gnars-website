import { cache } from "react";
import {
  SubgraphSDK,
  governorAbi,
  type Proposal_Filter,
  type Proposal as SdkProposal,
} from "@buildeross/sdk";
import type { Proposal } from "@/components/proposals/types";
import { CHAIN, GNARS_ADDRESSES, SUBGRAPH } from "@/lib/config";
import { serverPublicClient } from "@/lib/rpc";
import { getProposalStatus } from "@/lib/schemas/proposals";

/** Fetch vote timestamps from subgraph (the SDK fragment omits this field) */
async function fetchVoteTimestamps(
  proposalId: string,
): Promise<Record<string, number>> {
  const query = `{
    proposalVotes(
      where: { proposal: "${proposalId.toLowerCase()}" }
      first: 1000
      orderBy: timestamp
      orderDirection: desc
    ) {
      voter
      timestamp
    }
  }`;
  try {
    const res = await fetch(SUBGRAPH.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    const map: Record<string, number> = {};
    for (const v of data?.data?.proposalVotes ?? []) {
      map[String(v.voter).toLowerCase()] = Number(v.timestamp);
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Fetch proposal state from the governor contract using our resilient RPC client.
 * Replaces the SDK's internal client which only uses mainnet.base.org.
 */
async function fetchProposalState(
  governorAddress: string,
  proposalId: string,
): Promise<number> {
  return serverPublicClient.readContract({
    address: governorAddress as `0x${string}`,
    abi: governorAbi,
    functionName: "state",
    args: [proposalId as `0x${string}`],
  }) as Promise<number>;
}

/**
 * Format a raw subgraph proposal with on-chain state fetched via our resilient client.
 * Replaces SDK's formatAndFetchState.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function formatWithState(raw: any): Promise<SdkProposal> {
  const governorAddress = raw.dao?.governorAddress ?? GNARS_ADDRESSES.governor;
  const state = await fetchProposalState(governorAddress, raw.proposalId);

  return {
    ...raw,
    calldatas: raw.calldatas ? raw.calldatas.split(":") : [],
    state,
  } as SdkProposal;
}

// Minimal transformation: SDK Proposal → App Proposal
// The SDK already provides most fields we need via formatAndFetchState()
function transformProposal(p: SdkProposal): Proposal {
  return {
    proposalId: String(p.proposalId),
    proposalNumber: Number(p.proposalNumber),
    title: p.title ?? "",
    description: p.description ?? "",
    proposer: String(p.proposer),
    status: getProposalStatus(p.state),
    proposerEnsName: undefined,
    createdAt: Number(p.timeCreated ?? 0) * 1000,
    endBlock: Number(p.voteEnd ?? 0),
    snapshotBlock: p.snapshotBlockNumber ? Number(p.snapshotBlockNumber) : undefined,
    endDate: p.voteEnd ? new Date(Number(p.voteEnd) * 1000) : undefined,
    forVotes: Number(p.forVotes ?? 0),
    againstVotes: Number(p.againstVotes ?? 0),
    abstainVotes: Number(p.abstainVotes ?? 0),
    quorumVotes: Number(p.quorumVotes ?? 0),
    calldatas: Array.isArray(p.calldatas) ? p.calldatas : [],
    targets: Array.isArray(p.targets) ? p.targets.map(String) : [],
    values: Array.isArray(p.values) ? p.values.map(String) : [],
    // signatures not provided by SDK and not needed for transaction decoding
    signatures: [],
    transactionHash: String(p.transactionHash ?? ""),
    votes: Array.isArray(p.votes)
      ? p.votes.map((v) => ({
          voter: String(v.voter),
          voterEnsName: undefined,
          choice: (() => {
            const s = String(v.support ?? "").toUpperCase();
            if (s.includes("FOR")) return "FOR";
            if (s.includes("AGAINST")) return "AGAINST";
            return "ABSTAIN";
          })() as "FOR" | "AGAINST" | "ABSTAIN",
          votes: String(v.weight ?? 0),
          transactionHash: "",
          reason: (v as { reason?: string | null }).reason ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          timestamp: (v as any).timestamp ? Number((v as any).timestamp) : undefined,
        }))
      : [],
    voteStart: new Date(Number(p.voteStart ?? 0) * 1000).toISOString(),
    voteEnd: new Date(Number(p.voteEnd ?? 0) * 1000).toISOString(),
    expiresAt: p.expiresAt ? new Date(Number(p.expiresAt) * 1000).toISOString() : undefined,
    timeCreated: Number(p.timeCreated ?? 0),
    // Queue/Execute timing fields
    executableFrom:
      "executableFrom" in p && p.executableFrom
        ? new Date(Number(p.executableFrom) * 1000).toISOString()
        : undefined,
    queuedAt:
      "queuedAt" in p && p.queuedAt ? new Date(Number(p.queuedAt) * 1000).toISOString() : undefined,
    executedAt:
      "executedAt" in p && p.executedAt
        ? new Date(Number(p.executedAt) * 1000).toISOString()
        : undefined,
    descriptionHash: "descriptionHash" in p ? String(p.descriptionHash ?? "") : "",
  };
}

export const listProposals = cache(async (limit = 200, page = 0): Promise<Proposal[]> => {
  const data = await SubgraphSDK.connect(CHAIN.id).proposals({
    where: { dao: GNARS_ADDRESSES.token.toLowerCase() },
    first: limit,
    skip: page * limit,
  });

  const sdkProposals = data.proposals ?? [];

  return Promise.all(
    sdkProposals.map((raw) => formatWithState(raw).then(transformProposal)),
  );
});

export const getProposalByIdOrNumber = cache(
  async (idOrNumber: string): Promise<Proposal | null> => {
    const isHexId = idOrNumber.startsWith("0x");

    const where: Proposal_Filter = isHexId
      ? { proposalId: idOrNumber.toLowerCase() }
      : {
          proposalNumber: Number.parseInt(idOrNumber, 10),
          dao: GNARS_ADDRESSES.token.toLowerCase(),
        };

    const data = await SubgraphSDK.connect(CHAIN.id).proposals({
      where,
      first: 1,
    });

    if (!data.proposals || data.proposals.length === 0) {
      return null; // Genuinely not found
    }

    // RPC errors will propagate (not swallowed) so callers can distinguish
    // "not found" (null) from "transient failure" (thrown error)
    const sdkProposal = await formatWithState(data.proposals[0]);
    const proposal = transformProposal(sdkProposal);

    if (proposal.votes && proposal.votes.length > 0) {
      const timestampMap = await fetchVoteTimestamps(proposal.proposalId);
      proposal.votes = proposal.votes
        .map((v) => ({
          ...v,
          timestamp: timestampMap[v.voter.toLowerCase()] ?? v.timestamp,
        }))
        .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    }

    return proposal;
  },
);
