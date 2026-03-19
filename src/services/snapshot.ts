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
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public/data/snapshot-proposals.json");
      const fileContents = fs.readFileSync(filePath, "utf8");
      const snapshotProposalsData = JSON.parse(fileContents) as SnapshotProposal[];
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
