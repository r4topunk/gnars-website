import { z } from "zod";
import type { ProposalRepository } from "../db/repository.js";
import { subgraphClient } from "../subgraph/client.js";

export const syncProposalsSchema = z.object({
  full: z.boolean().default(false).describe("If true, re-sync all proposals. Default: incremental sync"),
});

export type SyncProposalsInput = z.infer<typeof syncProposalsSchema>;

export interface SyncProposalsOutput {
  synced: number;
  updated: number;
  errors: string[];
  lastSyncTime: string;
}

export async function syncProposals(
  repo: ProposalRepository,
  input: SyncProposalsInput
): Promise<SyncProposalsOutput> {
  const errors: string[] = [];
  let synced = 0;
  let updated = 0;

  try {
    if (input.full) {
      // Full sync: fetch all proposals in batches
      let offset = 0;
      const batchSize = 50;
      let hasMore = true;

      while (hasMore) {
        try {
          const proposals = await subgraphClient.fetchProposals(batchSize, offset);

          if (proposals.length === 0) {
            hasMore = false;
            break;
          }

          const count = repo.upsertProposals(proposals);
          synced += count;
          offset += proposals.length;

          // Fetch votes for each proposal
          for (const proposal of proposals) {
            try {
              const votes = await subgraphClient.fetchVotes(proposal.proposalNumber);
              if (votes.length > 0) {
                repo.upsertVotes(votes, proposal.proposalId);
              }
            } catch (err) {
              errors.push(`Failed to fetch votes for proposal ${proposal.proposalNumber}: ${err}`);
            }
          }

          if (proposals.length < batchSize) {
            hasMore = false;
          }
        } catch (err) {
          errors.push(`Failed to fetch proposals at offset ${offset}: ${err}`);
          hasMore = false;
        }
      }
    } else {
      // Incremental sync: fetch proposals since last sync
      const lastSync = repo.getLastSyncTime() ?? 0;

      try {
        const proposals = await subgraphClient.fetchRecentProposals(lastSync);
        const count = repo.upsertProposals(proposals);
        synced = count;
        updated = count; // In incremental, all fetched are considered updates

        // Fetch votes for recent proposals
        for (const proposal of proposals) {
          try {
            const votes = await subgraphClient.fetchVotes(proposal.proposalNumber);
            if (votes.length > 0) {
              repo.upsertVotes(votes, proposal.proposalId);
            }
          } catch (err) {
            errors.push(`Failed to fetch votes for proposal ${proposal.proposalNumber}: ${err}`);
          }
        }
      } catch (err) {
        errors.push(`Failed to fetch recent proposals: ${err}`);
      }
    }
  } catch (err) {
    errors.push(`Sync failed: ${err}`);
  }

  const now = Math.floor(Date.now() / 1000);
  repo.setLastSyncTime(now);

  return {
    synced,
    updated,
    errors,
    lastSyncTime: new Date(now * 1000).toISOString(),
  };
}
