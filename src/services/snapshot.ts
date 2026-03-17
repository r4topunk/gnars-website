import { cache } from "react";
import type { SnapshotProposal } from "@/types/snapshot";

/**
 * Load Snapshot proposals from static JSON (no API calls needed)
 * Data is historical and won't change (all governance moved to on-chain)
 */
export const listSnapshotProposals = cache(
  async (
    limit = 50,
    skip = 0,
    state?: "pending" | "active" | "closed"
  ): Promise<SnapshotProposal[]> => {
    try {
      const response = await fetch("/data/snapshot-proposals.json");
      const snapshotProposalsData = (await response.json()) as SnapshotProposal[];
      let proposals = snapshotProposalsData;

      // Filter by state if provided
      if (state) {
        proposals = proposals.filter((p) => p.state === state);
      }

      // Apply pagination
      return proposals.slice(skip, skip + limit);
    } catch (error) {
      console.error("[snapshot] Failed to load proposals:", error);
      return [];
    }
  }
);

/**
 * Get a specific Snapshot proposal from static JSON
 */
export const getSnapshotProposal = cache(
  async (id: string): Promise<SnapshotProposal | null> => {
    try {
      const response = await fetch("/data/snapshot-proposals.json");
      const snapshotProposalsData = (await response.json()) as SnapshotProposal[];
      return snapshotProposalsData.find((p) => p.id === id) ?? null;
    } catch (error) {
      console.error("[snapshot] Failed to load proposal:", error);
      return null;
    }
  }
);
