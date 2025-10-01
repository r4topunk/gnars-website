import {
  getProposal,
  getProposals,
  SubgraphSDK,
  formatAndFetchState,
  type Proposal as SdkProposal,
  type Proposal_Filter,
} from "@buildeross/sdk";
import type { Proposal, ProposalVote } from "@/components/proposals/types";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { getProposalStatus, proposalSchema } from "@/lib/schemas/proposals";

function mapSdkProposalToProposal(p: SdkProposal): Proposal {
  const endDate = (() => {
    const voteEnd = Number(p.voteEnd ?? 0);
    if (voteEnd > 0) return new Date(voteEnd * 1000);
    const record = p as unknown as Record<string, unknown>;
    const expiresAtRaw = record["expiresAt"];
    const expiresAtNumber =
      typeof expiresAtRaw === "number"
        ? expiresAtRaw
        : typeof expiresAtRaw === "string"
          ? Number.parseInt(expiresAtRaw, 10)
          : 0;
    return expiresAtNumber > 0 ? new Date(expiresAtNumber * 1000) : undefined;
  })();

  const proposal: Proposal = {
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
    endDate,
    forVotes: Number(p.forVotes ?? 0),
    againstVotes: Number(p.againstVotes ?? 0),
    abstainVotes: Number(p.abstainVotes ?? 0),
    quorumVotes: Number(p.quorumVotes ?? 0),
    calldatas: (() => {
      const direct = (p as unknown as { calldatas?: unknown }).calldatas;
      if (Array.isArray(direct)) return direct.map(String);
      if (typeof direct === "string") return [direct];
      const record = p as unknown as Record<string, unknown>;
      const raw = record["calldatas"];
      if (Array.isArray(raw)) return raw.map(String);
      if (typeof raw === "string") return [raw];
      return [] as string[];
    })(),
    targets: (p.targets as unknown[] | undefined)?.map(String) ?? [],
    values: (p.values as unknown[] | undefined)?.map(String) ?? [],
    signatures: (() => {
      const direct = (p as unknown as { signatures?: unknown }).signatures;
      if (Array.isArray(direct)) return direct.map(String);
      if (typeof direct === "string") return [direct];
      const record = p as unknown as Record<string, unknown>;
      const raw = record["signatures"];
      if (Array.isArray(raw)) return raw.map(String);
      if (typeof raw === "string") return [raw];
      return [] as string[];
    })(),
    transactionHash: String(p.transactionHash ?? ""),
    votes: Array.isArray(p.votes)
      ? p.votes.map(
          (v): ProposalVote => ({
            voter: String(v.voter),
            voterEnsName: undefined,
            choice: ((): ProposalVote["choice"] => {
              const s = String(v.support ?? "").toUpperCase();
              if (s.includes("FOR")) return "FOR";
              if (s.includes("AGAINST")) return "AGAINST";
              return "ABSTAIN";
            })(),
            votes: String(v.weight ?? 0),
            transactionHash: "",
            reason: (v as unknown as { reason?: string | null }).reason ?? null,
          }),
        )
      : [],
    voteStart: new Date(Number(p.voteStart ?? 0) * 1000).toISOString(),
    voteEnd: new Date(Number(p.voteEnd ?? 0) * 1000).toISOString(),
    expiresAt: p.expiresAt ? new Date(Number(p.expiresAt) * 1000).toISOString() : undefined,
    timeCreated: Number(p.timeCreated ?? 0),
  };

  return proposalSchema.parse(proposal);
}

export async function listProposals(limit = 200, page = 0): Promise<Proposal[]> {
  const { proposals: sdkProposals } = await getProposals(
    CHAIN.id,
    GNARS_ADDRESSES.token,
    limit,
    page,
  );

  const mapped = ((sdkProposals as SdkProposal[] | undefined) ?? []).map(mapSdkProposalToProposal);
  return mapped;
}

export async function getProposalByIdOrNumber(idOrNumber: string): Promise<Proposal | null> {
  try {
    console.log("[proposals:getProposalByIdOrNumber] start", {
      idOrNumber,
      chainId: CHAIN.id,
      token: GNARS_ADDRESSES.token,
    });

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

    console.log("[proposals:getProposalByIdOrNumber] querying with filter", { where });

    // Direct query using SubgraphSDK (same pattern as Nouns Builder)
    const data = await SubgraphSDK.connect(CHAIN.id).proposals({
      where,
      first: 1,
    });

    if (!data.proposals || data.proposals.length === 0) {
      console.warn("[proposals:getProposalByIdOrNumber] no proposal found", {
        idOrNumber,
        where,
      });
      return null;
    }

    // Use formatAndFetchState to get proposal state from contract
    const sdkProposal = await formatAndFetchState(CHAIN.id, data.proposals[0]);

    if (!sdkProposal) {
      console.warn("[proposals:getProposalByIdOrNumber] formatAndFetchState returned null", {
        idOrNumber,
      });
      return null;
    }

    const mapped = mapSdkProposalToProposal(sdkProposal);
    console.log("[proposals:getProposalByIdOrNumber] found", {
      proposalId: mapped.proposalId,
      proposalNumber: mapped.proposalNumber,
    });

    return mapped;
  } catch (err) {
    console.error("[proposals:getProposalByIdOrNumber] error", {
      idOrNumber,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
    });
    return null;
  }
}
