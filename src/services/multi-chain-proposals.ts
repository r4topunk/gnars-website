import { cache } from "react";
import type { Proposal } from "@/components/proposals/types";
import { listProposals as listBaseProposals, getProposalByIdOrNumber } from "./proposals";
import { getProposalStatus, ProposalStatus } from "@/lib/schemas/proposals";
import type { SnapshotProposal } from "@/types/snapshot";

export type ProposalSource = "base" | "ethereum" | "snapshot";

export interface MultiChainProposal extends Proposal {
  source: ProposalSource;
  chainId: number;
  /** Optional human-readable descriptions for each transaction (from manually annotated data) */
  txDescriptions?: string[];
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
  calldatas?: string[];
  targets?: string[];
  values?: string[];
}

/**
 * Load Ethereum proposals from static JSON (no API calls needed)
 * Data is historical and won't change (all governance moved to Base)
 */
async function loadEthProposals(limit = 100, skip = 0): Promise<MultiChainProposal[]> {
  try {
    let ethereumProposalsData: EthProposalRaw[];
    
    // Try filesystem first (for build time), then fetch (for runtime)
    try {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public/data/ethereum-proposals.json");
      const fileContents = fs.readFileSync(filePath, "utf8");
      ethereumProposalsData = JSON.parse(fileContents);
    } catch (fsError) {
      // Fallback to fetch if file system access fails (e.g., in serverless)
      console.log("[loadEthProposals] Filesystem failed, trying fetch:", fsError);
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://gnars.com'}/data/ethereum-proposals.json`, {
        next: { revalidate: 3600 }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch ethereum proposals: ${response.status}`);
      }
      ethereumProposalsData = await response.json();
    }
    
    const proposals = ethereumProposalsData.slice(skip, skip + limit);

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
        calldatas: p.calldatas ?? [],
        targets: p.targets ?? [],
        values: p.values ?? [],
        signatures: [],
        transactionHash: "",
        votes: [],
        voteStart: new Date(Number(p.createdTimestamp) * 1000).toISOString(),
        voteEnd: new Date((Number(p.createdTimestamp) + (Number(p.endBlock) - Number(p.startBlock)) * 12) * 1000).toISOString(),
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
 * Load Snapshot proposals from static JSON and convert to MultiChainProposal format
 */
// Load Snapshot transaction data from static JSON
interface SnapshotTransaction {
  proposalId: string;
  proposalNumber: number;
  transactions: Array<{
    target: string;
    value: string;
    calldata: string;
    description?: string;
  }>;
}

async function loadSnapshotTransactions(): Promise<Map<string, SnapshotTransaction>> {
  try {
    let txData: SnapshotTransaction[];
    
    try {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public/data/snapshot-transactions.json");
      const fileContents = fs.readFileSync(filePath, "utf8");
      txData = JSON.parse(fileContents);
    } catch (fsError) {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://gnars.com'}/data/snapshot-transactions.json`, {
        next: { revalidate: 3600 }
      });
      if (!response.ok) return new Map();
      txData = await response.json();
    }
    
    return new Map(txData.map(tx => [tx.proposalId, tx]));
  } catch (error) {
    console.error("[loadSnapshotTransactions] Failed:", error);
    return new Map();
  }
}

async function loadSnapshotProposals(limit = 100, skip = 0): Promise<MultiChainProposal[]> {
  try {
    let snapshotProposalsData: SnapshotProposal[];
    
    // Try filesystem first (for build time), then fetch (for runtime)
    try {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public/data/snapshot-proposals.json");
      const fileContents = fs.readFileSync(filePath, "utf8");
      snapshotProposalsData = JSON.parse(fileContents);
    } catch (fsError) {
      // Fallback to fetch if file system access fails (e.g., in serverless)
      console.log("[loadSnapshotProposals] Filesystem failed, trying fetch:", fsError);
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://gnars.com'}/data/snapshot-proposals.json`, {
        next: { revalidate: 3600 }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch snapshot proposals: ${response.status}`);
      }
      snapshotProposalsData = await response.json();
    }
    
    // Load transaction data
    const txMap = await loadSnapshotTransactions();
    
    const proposals = snapshotProposalsData.slice(skip, skip + limit);

    return proposals.map((p, index) => {
      const proposalNumber = snapshotProposalsData.length - skip - index;
      const createdAt = p.created * 1000;
      
      // Map Snapshot state to ProposalStatus
      let status: ProposalStatus;
      switch (p.state) {
        case "active":
          status = ProposalStatus.ACTIVE;
          break;
        case "closed":
          status = ProposalStatus.EXECUTED;
          break;
        case "pending":
          status = ProposalStatus.PENDING;
          break;
        default:
          status = ProposalStatus.EXECUTED;
      }

      // Check if we have transaction data for this proposal
      const txData = txMap.get(p.id);
      const targets = txData?.transactions.map(tx => tx.target) || [];
      const values = txData?.transactions.map(tx => tx.value) || [];
      const calldatas = txData?.transactions.map(tx => tx.calldata) || [];
      const txDescriptions = txData?.transactions.map(tx => tx.description || "") || [];

      return {
        proposalId: p.id,
        proposalNumber,
        title: p.title || `Snapshot Proposal #${proposalNumber}`,
        description: p.body || "",
        proposer: p.author,
        proposerEnsName: undefined,
        status,
        createdAt,
        endBlock: 0,
        snapshotBlock: p.snapshot,
        endDate: undefined,
        forVotes: p.scores[0] || 0,
        againstVotes: p.scores[1] || 0,
        abstainVotes: p.scores[2] || 0,
        quorumVotes: 0,
        calldatas,
        targets,
        values,
        signatures: [],
        transactionHash: "",
        votes: [],
        voteStart: new Date(p.start * 1000).toISOString(),
        voteEnd: new Date(p.end * 1000).toISOString(),
        expiresAt: undefined,
        timeCreated: p.created,
        executableFrom: undefined,
        queuedAt: undefined,
        executedAt: p.state === "closed" ? new Date(p.end * 1000).toISOString() : undefined,
        descriptionHash: "",
        txDescriptions: txDescriptions.length > 0 ? txDescriptions : undefined,
        source: "snapshot" as const,
        chainId: 0, // Snapshot is off-chain
      };
    });
  } catch (error) {
    console.error("[multi-chain-proposals] Failed to load Snapshot proposals:", error);
    return [];
  }
}

/**
 * Fetch proposals from all chains and merge chronologically
 * @param includeEthereum - Include legacy Ethereum mainnet proposals
 * @param includeSnapshot - Include Snapshot proposals
 */
export const listMultiChainProposals = cache(
  async (
    limit = 200,
    includeEthereum = true,
    includeSnapshot = true,
  ): Promise<MultiChainProposal[]> => {
    // Fetch Base proposals (live data from subgraph)
    const baseProposals = await listBaseProposals(1000).then((proposals) =>
      proposals.map(
        (p): MultiChainProposal => ({
          ...p,
          source: "base",
          chainId: 8453,
        }),
      ),
    );

    // Load Ethereum proposals from static JSON (historical data)
    const ethProposals = includeEthereum ? await loadEthProposals(1000) : [];

    // Load Snapshot proposals from static JSON (historical data)
    const snapshotProposals = includeSnapshot ? await loadSnapshotProposals(1000) : [];

    // Merge and sort chronologically (newest first)
    const allProposals = [...baseProposals, ...ethProposals, ...snapshotProposals].sort(
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
      // Use getProposalByIdOrNumber to fetch votes with timestamps
      const proposal = await getProposalByIdOrNumber(idOrNumber);
      return proposal
        ? {
            ...proposal,
            source: "base",
            chainId: 8453,
          }
        : null;
    }

    if (source === "ethereum") {
      const ethProposals = await loadEthProposals(1000);
      const proposal = ethProposals.find(
        (p) =>
          p.proposalId === idOrNumber ||
          p.proposalNumber === Number.parseInt(idOrNumber, 10),
      );
      return proposal ?? null;
    }

    if (source === "snapshot") {
      const snapshotProposals = await loadSnapshotProposals(1000);
      const proposal = snapshotProposals.find(
        (p) =>
          p.proposalId === idOrNumber ||
          p.proposalNumber === Number.parseInt(idOrNumber, 10),
      );
      return proposal ?? null;
    }

    // No source specified - check all chains
    const allProposals = await listMultiChainProposals(1000, true, true);
    return (
      allProposals.find(
        (p) =>
          p.proposalId === idOrNumber ||
          p.proposalNumber === Number.parseInt(idOrNumber, 10),
      ) ?? null
    );
  },
);
