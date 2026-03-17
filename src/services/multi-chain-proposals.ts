import { cache } from "react";
import type { Proposal } from "@/components/proposals/types";
import { listProposals as listBaseProposals } from "./proposals";
import { getProposalStatus, ProposalStatus } from "@/lib/schemas/proposals";
import ethereumProposalsData from "../../data/ethereum-proposals.json";

export type ProposalSource = "base" | "ethereum" | "snapshot";

export interface MultiChainProposal extends Proposal {
  source: ProposalSource;
  chainId: number;
}

// Ethereum proposal data structure from static JSON
interface EthProposalRaw {
  id: string;
  createdTimestamp: string;
  startBlock: string;
  endBlock: string;
  executionETA: string | null;
  title: string;
  description?: string;
  status: string;
  proposer: { id: string };
  forVotes: string;
  abstainVotes: string;
  againstVotes: string;
  quorumVotes: string;
  totalSupply: string;
}

/**
 * Load Ethereum proposals from static JSON (no API calls needed)
 * Data is historical and won't change (all governance moved to Base)
 */
function loadEthProposals(limit = 100, skip = 0): MultiChainProposal[] {
  try {
    const proposals = (ethereumProposalsData as unknown as EthProposalRaw[])
      .slice(skip, skip + limit);

    return proposals.map((p) => {
      const proposalNumber = Number.parseInt(p.id, 10);
      const createdAt = Number(p.createdTimestamp) * 1000;
      const status = getProposalStatus(p.status as ProposalStatus) || ProposalStatus.EXECUTED;

      return {
        proposalId: p.id,
        proposalNumber,
        title: p.title || `Proposal #${proposalNumber}`,
        description: p.description || "",
        proposer: p.proposer.id,
        proposerEnsName: undefined,
        status,
        createdAt,
        endBlock: Number(p.endBlock),
        snapshotBlock: Number(p.startBlock),
        endDate: undefined,
        forVotes: Number(p.forVotes),
        againstVotes: Number(p.againstVotes),
        abstainVotes: Number(p.abstainVotes),
        quorumVotes: Number(p.quorumVotes),
        calldatas: [],
        targets: [],
        values: [],
        signatures: [],
        transactionHash: "",
        votes: [],
        voteStart: new Date(Number(p.startBlock) * 12 * 1000).toISOString(),
        voteEnd: new Date(Number(p.endBlock) * 12 * 1000).toISOString(),
        expiresAt: p.executionETA
          ? new Date(Number(p.executionETA) * 1000).toISOString()
          : undefined,
        timeCreated: Number(p.createdTimestamp),
        executableFrom: undefined,
        queuedAt: undefined,
        executedAt: undefined,
        descriptionHash: "",
        source: "ethereum" as const,
        chainId: 1,
      };
    });
  } catch (error) {
    console.error("[multi-chain-proposals] Failed to load ETH proposals:", error);
    return [];
  }
}

/**
 * Fetch proposals from all chains and merge chronologically
 * @param includeEthereum - Include legacy Ethereum mainnet proposals
 * @param includeSnapshot - Include Snapshot proposals (not yet implemented)
 */
export const listMultiChainProposals = cache(
  async (
    limit = 200,
    includeEthereum = true,
    _includeSnapshot = false,
  ): Promise<MultiChainProposal[]> => {
    // Fetch Base proposals (live data from subgraph)
    const baseProposals = await listBaseProposals(limit).then((proposals) =>
      proposals.map(
        (p): MultiChainProposal => ({
          ...p,
          source: "base",
          chainId: 8453,
        }),
      ),
    );

    // Load Ethereum proposals from static JSON (historical data)
    const ethProposals = includeEthereum ? loadEthProposals(limit) : [];

    // Merge and sort chronologically (newest first)
    const allProposals = [...baseProposals, ...ethProposals].sort(
      (a, b) => b.createdAt - a.createdAt,
    );

    return allProposals.slice(0, limit);
  },
);

/**
 * Get a specific proposal by ID or number, checking both chains
 */
export const getMultiChainProposal = cache(
  async (idOrNumber: string, source?: ProposalSource): Promise<MultiChainProposal | null> => {
    // If source is specified, only check that chain
    if (source === "base") {
      const baseProposals = await listBaseProposals(1000);
      const proposal = baseProposals.find(
        (p) =>
          p.proposalId === idOrNumber ||
          p.proposalNumber === Number.parseInt(idOrNumber, 10),
      );
      return proposal
        ? {
            ...proposal,
            source: "base",
            chainId: 8453,
          }
        : null;
    }

    if (source === "ethereum") {
      const ethProposals = loadEthProposals(1000);
      const proposal = ethProposals.find(
        (p) =>
          p.proposalId === idOrNumber ||
          p.proposalNumber === Number.parseInt(idOrNumber, 10),
      );
      return proposal ?? null;
    }

    // No source specified - check all chains
    const allProposals = await listMultiChainProposals(1000, true, false);
    return (
      allProposals.find(
        (p) =>
          p.proposalId === idOrNumber ||
          p.proposalNumber === Number.parseInt(idOrNumber, 10),
      ) ?? null
    );
  },
);
