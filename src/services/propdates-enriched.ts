/**
 * Propdates Enriched Service
 *
 * Joins propdates (EAS attestations) with lightweight proposal metadata
 * (title, number, status, proposer) for use in feeds and list views.
 *
 * Data flow:
 *   listDaoPropdates()   — one batched EAS fetch, 30s in-memory cache
 *   listBaseProposals()  — subgraph + per-proposal state RPC, React cache()
 *
 * Proposals that cannot be matched (e.g. Ethereum/Snapshot legacy IDs) are
 * preserved with proposal: null so callers can decide how to handle them.
 */

import { zeroHash } from "viem";
import { listDaoPropdates, type Propdate } from "./propdates";
import { listProposals as listBaseProposals } from "./proposals";
import type { ProposalStatus } from "@/lib/schemas/proposals";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ProposalSummary {
  proposalId: string;
  proposalNumber: number;
  title: string;
  status: ProposalStatus;
  proposer: string;
}

export interface EnrichedPropdate {
  propdate: Propdate;
  proposal: ProposalSummary | null;
}

/** Propdates grouped by proposal, suitable for a feed grouped by proposal. */
export interface ProposalWithPropdates {
  proposal: ProposalSummary;
  /** Top-level propdates only (replies excluded), sorted newest first. */
  propdates: Propdate[];
  /** Unix timestamp (seconds) of the most recent top-level propdate. */
  latestUpdate: number;
  /** Total count of top-level propdates for this proposal. */
  updateCount: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const ENRICHED_CACHE_TTL_MS = 30_000;

let enrichedCache: { data: ProposalWithPropdates[]; expiresAt: number } | null = null;
let enrichedPromise: Promise<ProposalWithPropdates[]> | null = null;

/** Returns true when `originalMessageId` indicates a reply (not a root propdate). */
function isReply(propdate: Propdate): boolean {
  return (
    Boolean(propdate.originalMessageId) && propdate.originalMessageId !== zeroHash
  );
}

async function buildEnrichedFeed(): Promise<ProposalWithPropdates[]> {
  // Parallel fetch — propdates and proposals are independent data sources.
  const [allPropdates, baseProposals] = await Promise.all([
    listDaoPropdates(),
    // listBaseProposals() uses React cache(), so concurrent page renders share
    // one subgraph round-trip. Limit 1000 matches the existing multi-chain usage.
    listBaseProposals(1000),
  ]);

  // Build a lookup map: lowercase proposalId hex → ProposalSummary
  const proposalMap = new Map<string, ProposalSummary>();
  for (const p of baseProposals) {
    proposalMap.set(p.proposalId.toLowerCase(), {
      proposalId: p.proposalId,
      proposalNumber: p.proposalNumber,
      title: p.title,
      status: p.status,
      proposer: p.proposer,
    });
  }

  // Group top-level propdates by proposalId
  const groups = new Map<string, Propdate[]>();
  for (const pd of allPropdates) {
    if (isReply(pd)) continue; // skip replies at the feed level

    const key = pd.proposalId.toLowerCase();
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(pd);
    } else {
      groups.set(key, [pd]);
    }
  }

  // Build ProposalWithPropdates entries — skip groups with no matched proposal
  const result: ProposalWithPropdates[] = [];
  for (const [key, propdates] of groups) {
    const proposal = proposalMap.get(key);
    if (!proposal) {
      // Proposal is from Ethereum/Snapshot or otherwise unknown; skip grouping.
      continue;
    }

    // Sort newest first within each group
    const sorted = [...propdates].sort((a, b) => b.timeCreated - a.timeCreated);
    if (sorted.length === 0) continue;

    result.push({
      proposal,
      propdates: sorted,
      latestUpdate: sorted[0].timeCreated,
      updateCount: sorted.length,
    });
  }

  // Sort groups by most recent update descending
  result.sort((a, b) => b.latestUpdate - a.latestUpdate);

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all DAO propdates grouped by proposal, enriched with proposal
 * metadata. Groups without a matching Base proposal are omitted.
 *
 * Results are cached in-memory for 30 seconds and deduplicated across
 * concurrent callers (same pattern as listDaoPropdates).
 */
export async function getEnrichedPropdatesFeed(): Promise<ProposalWithPropdates[]> {
  const now = Date.now();

  if (enrichedCache && now < enrichedCache.expiresAt) {
    return enrichedCache.data;
  }

  if (enrichedPromise) {
    return enrichedPromise;
  }

  enrichedPromise = buildEnrichedFeed()
    .then((data) => {
      enrichedCache = { data, expiresAt: Date.now() + ENRICHED_CACHE_TTL_MS };
      return data;
    })
    .catch((error) => {
      if (enrichedCache) {
        console.warn(
          "[propdates-enriched:getEnrichedPropdatesFeed] serving stale cache after fetch failure",
          { error: error instanceof Error ? error.message : String(error) },
        );
        return enrichedCache.data;
      }
      throw error;
    })
    .finally(() => {
      enrichedPromise = null;
    });

  try {
    return await enrichedPromise;
  } catch (err) {
    console.error("[propdates-enriched:getEnrichedPropdatesFeed] fetch failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Returns every propdate paired with its proposal summary (or null if not
 * found). Replies are included here — callers decide whether to show them.
 *
 * This is the flat list variant of getEnrichedPropdatesFeed; use it when
 * you need per-propdate rendering rather than the grouped feed.
 */
export async function getEnrichedPropdatesList(): Promise<EnrichedPropdate[]> {
  const [allPropdates, baseProposals] = await Promise.all([
    listDaoPropdates(),
    listBaseProposals(1000),
  ]);

  const proposalMap = new Map<string, ProposalSummary>();
  for (const p of baseProposals) {
    proposalMap.set(p.proposalId.toLowerCase(), {
      proposalId: p.proposalId,
      proposalNumber: p.proposalNumber,
      title: p.title,
      status: p.status,
      proposer: p.proposer,
    });
  }

  // Sort newest first across all propdates
  const sorted = [...allPropdates].sort((a, b) => b.timeCreated - a.timeCreated);

  return sorted.map((pd) => ({
    propdate: pd,
    proposal: proposalMap.get(pd.proposalId.toLowerCase()) ?? null,
  }));
}
