import { getProposal, getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
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
    // Instrumentation: trace inputs and code paths for intermittent "not found" cases
    console.log("[proposals:getProposalByIdOrNumber] start", {
      idOrNumber,
      chainId: CHAIN.id,
      token: GNARS_ADDRESSES.token,
    });
    const isHexId = idOrNumber.startsWith("0x");
    if (isHexId) {
      try {
        const sdkProposal = await getProposal(CHAIN.id as unknown as number, idOrNumber);
        if (!sdkProposal) {
          console.warn("[proposals:getProposalByIdOrNumber] no proposal by hex id", {
            idOrNumber,
          });
          return null;
        }
        const mapped = mapSdkProposalToProposal(sdkProposal);
        console.log("[proposals:getProposalByIdOrNumber] found by hex id", {
          proposalId: mapped.proposalId,
          proposalNumber: mapped.proposalNumber,
        });
        return mapped;
      } catch (err) {
        console.error("[proposals:getProposalByIdOrNumber] error fetching by hex id", {
          idOrNumber,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }

    const targetNumber = Number.parseInt(idOrNumber, 10);
    if (Number.isNaN(targetNumber)) return null;

    const LIMIT = 200;
    const MAX_PAGES = 5;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      console.log("[proposals:getProposalByIdOrNumber] querying by number", {
        targetNumber,
        page,
        limit: LIMIT,
      });
      const { proposals } = await getProposals(
        CHAIN.id as unknown as number,
        GNARS_ADDRESSES.token,
        LIMIT,
        page,
      );
      const match = (proposals ?? []).find((p) => Number(p.proposalNumber ?? -1) === targetNumber);
      if (match) {
        const mapped = mapSdkProposalToProposal(match);
        console.log("[proposals:getProposalByIdOrNumber] found by number", {
          proposalId: mapped.proposalId,
          proposalNumber: mapped.proposalNumber,
          page,
        });
        return mapped;
      }
      if (!proposals || proposals.length < LIMIT) {
        console.warn("[proposals:getProposalByIdOrNumber] page underfilled or empty; stopping", {
          page,
          returned: proposals?.length ?? 0,
        });
        break;
      }
    }
    console.warn("[proposals:getProposalByIdOrNumber] not found after pagination", {
      idOrNumber,
      targetNumber,
      maxPagesTried: MAX_PAGES,
      limitPerPage: LIMIT,
    });
    return null;
  } catch (err) {
    console.error("[proposals:getProposalByIdOrNumber] unexpected error", {
      idOrNumber,
      error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
    });
    return null;
  }
}
