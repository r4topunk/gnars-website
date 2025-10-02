import {
  getProposals,
  SubgraphSDK,
  formatAndFetchState,
  type Proposal as SdkProposal,
  type Proposal_Filter,
} from "@buildeross/sdk";
import type { Proposal } from "@/components/proposals/types";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { getProposalStatus } from "@/lib/schemas/proposals";

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
        }))
      : [],
    voteStart: new Date(Number(p.voteStart ?? 0) * 1000).toISOString(),
    voteEnd: new Date(Number(p.voteEnd ?? 0) * 1000).toISOString(),
    expiresAt: p.expiresAt ? new Date(Number(p.expiresAt) * 1000).toISOString() : undefined,
    timeCreated: Number(p.timeCreated ?? 0),
  };
}

export async function listProposals(limit = 200, page = 0): Promise<Proposal[]> {
  const { proposals: sdkProposals } = await getProposals(
    CHAIN.id,
    GNARS_ADDRESSES.token,
    limit,
    page,
  );

  return ((sdkProposals as SdkProposal[] | undefined) ?? []).map(transformProposal);
}

export async function getProposalByIdOrNumber(idOrNumber: string): Promise<Proposal | null> {
  try {
    const isHexId = idOrNumber.startsWith("0x");

    // Build the where filter for direct subgraph query
    const where: Proposal_Filter = isHexId
      ? {
          proposalId: idOrNumber.toLowerCase(),
        }
      : {
          proposalNumber: Number.parseInt(idOrNumber, 10),
          dao: GNARS_ADDRESSES.token.toLowerCase(),
        };

    // Direct query using SubgraphSDK (same pattern as Nouns Builder)
    const data = await SubgraphSDK.connect(CHAIN.id).proposals({
      where,
      first: 1,
    });

    if (!data.proposals || data.proposals.length === 0) {
      return null;
    }

    // Use formatAndFetchState to get proposal state from contract
    const sdkProposal = await formatAndFetchState(CHAIN.id, data.proposals[0]);

    if (!sdkProposal) {
      return null;
    }

    const proposal = transformProposal(sdkProposal);
    return proposal;
  } catch (err) {
    console.error("[proposals:getProposalByIdOrNumber] error", {
      idOrNumber,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
    });
    return null;
  }
}
