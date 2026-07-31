import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  governorAbi,
  SubgraphSDK,
  type Proposal_Filter,
  type Proposal as SdkProposal,
} from "@buildeross/sdk";
import type { Proposal } from "@/components/proposals/types";
import { CACHE_TAGS, proposalTag } from "@/lib/cache-tags";
import { CHAIN, DAO_ADDRESSES, SUBGRAPH } from "@/lib/config";
import { serverPublicClient } from "@/lib/rpc";
import { getProposalStatus } from "@/lib/schemas/proposals";

/** Retry with exponential backoff on rate-limit / transient errors */
async function withRetry<T>(fn: () => Promise<T>, label: string, maxAttempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = /429|rate.?limit|too many requests/i.test(msg);
      const isTransient = isRateLimit || /fetch failed|ETIMEDOUT|ECONNRESET|503|502/i.test(msg);
      if (!isTransient || attempt === maxAttempts) throw err;
      const delay = Math.min(8_000, 500 * 2 ** (attempt - 1)) + Math.random() * 250;
      console.warn(
        `[${label}] attempt ${attempt} failed (${isRateLimit ? "429" : "transient"}); retry in ${Math.round(delay)}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** Fetch vote timestamps from subgraph (the SDK fragment omits this field) */
async function fetchVoteTimestamps(proposalId: string): Promise<Record<string, number>> {
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
    const res = await withRetry(async () => {
      const r = await fetch(SUBGRAPH.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (r.status === 429) throw new Error(`GraphQL Error (Code: 429)`);
      return r;
    }, "fetchVoteTimestamps");
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
async function fetchProposalState(governorAddress: string, proposalId: string): Promise<number> {
  return serverPublicClient.readContract({
    address: governorAddress as `0x${string}`,
    abi: governorAbi,
    functionName: "state",
    args: [proposalId as `0x${string}`],
  }) as Promise<number>;
}

/**
 * Derive a terminal governor state (Canceled/Vetoed/Executed) directly from
 * subgraph fields, skipping the `state()` RPC call entirely when possible.
 *
 * IMPORTANT: the SDK's generated `Proposal` fragment (@buildeross/sdk 0.1.3,
 * `chunk-JCFVLOEP`) does NOT expose `executed`/`canceled`/`vetoed`/`queued`
 * booleans — that shape only exists on the hand-written GQL query in
 * services/droposals.ts, which queries a different, custom field set. This
 * derivation instead relies on fields the generated fragment DOES carry:
 * `cancelTransactionHash`, `vetoTransactionHash`, `executionTransactionHash`,
 * `executedAt`. Each is only ever populated once that irreversible onchain
 * action has happened, so presence is an unambiguous, safe signal.
 *
 * Defeated/Expired/Queued are intentionally NOT derived here: replicating
 * the governor's quorum/threshold/grace-period logic client-side risks
 * silently diverging from the onchain source of truth. Those states — and
 * anything not conclusively terminal (Pending/Active/Succeeded/Queued) —
 * still fall through to the RPC read below.
 */
export function deriveTerminalState(raw: {
  cancelTransactionHash?: string | null;
  vetoTransactionHash?: string | null;
  executionTransactionHash?: string | null;
  executedAt?: string | number | null;
}): number | null {
  if (raw.cancelTransactionHash) return 2; // ProposalStatus.CANCELLED
  if (raw.vetoTransactionHash) return 8; // ProposalStatus.VETOED
  if (raw.executionTransactionHash || Number(raw.executedAt ?? 0) > 0) return 7; // ProposalStatus.EXECUTED
  return null;
}

/**
 * Format a raw subgraph proposal with on-chain state fetched via our resilient client.
 * Replaces SDK's formatAndFetchState. Skips the RPC call for proposals whose
 * terminal state is already derivable from subgraph fields (see
 * `deriveTerminalState`) — the big CPU win for Active-CPU quota.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function formatWithState(raw: any): Promise<SdkProposal> {
  const derivedState = deriveTerminalState(raw);
  const state =
    derivedState ??
    (await fetchProposalState(raw.dao?.governorAddress ?? DAO_ADDRESSES.governor, raw.proposalId));

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

/**
 * `unstable_cache` JSON-serializes its return value. `transformProposal`
 * puts a real `Date` in `endDate`, so after a cache round-trip it comes
 * back as an ISO string even though the `Proposal` type (and a couple of
 * direct consumers, e.g. `app/md/proposals/[id]/route.ts` calling
 * `.toLocaleDateString()`) expect a `Date`. Re-hydrate here, once, right
 * after reading from the cache, instead of pushing the string|Date
 * ambiguity onto every consumer. `new Date(x)` is a no-op-safe pass-through
 * whether `x` is already a `Date` or an ISO string, so this is safe to run
 * unconditionally on both cached and freshly-fetched (pre-serialization)
 * results.
 */
function rehydrateProposal(p: Proposal): Proposal {
  return p.endDate ? { ...p, endDate: new Date(p.endDate) } : p;
}

async function fetchProposalListUncached(limit: number, page: number): Promise<Proposal[]> {
  const data = await withRetry(
    () =>
      SubgraphSDK.connect(CHAIN.id).proposals({
        where: { dao: DAO_ADDRESSES.token.toLowerCase() },
        first: limit,
        skip: page * limit,
      }),
    "listProposals",
  );

  const sdkProposals = data.proposals ?? [];

  return Promise.all(sdkProposals.map((raw) => formatWithState(raw).then(transformProposal)));
}

// `limit`/`page` are passed as arguments to the wrapped function, so
// unstable_cache folds them into the cache key automatically — no need to
// thread them through the keyParts array below.
const listProposalsCached = unstable_cache(fetchProposalListUncached, ["proposals-list"], {
  tags: [CACHE_TAGS.proposals],
  revalidate: 1800,
});

export const listProposals = cache(async (limit = 200, page = 0): Promise<Proposal[]> => {
  const proposals = await listProposalsCached(limit, page);
  return proposals.map(rehydrateProposal);
});

async function fetchProposalByIdOrNumberUncached(idOrNumber: string): Promise<Proposal | null> {
  const isHexId = idOrNumber.startsWith("0x");

  const where: Proposal_Filter = isHexId
    ? { proposalId: idOrNumber.toLowerCase() }
    : {
        proposalNumber: Number.parseInt(idOrNumber, 10),
        dao: DAO_ADDRESSES.token.toLowerCase(),
      };

  // When we already have the canonical proposalId (hex path) we can
  // fetch vote timestamps in parallel with the SDK proposal query,
  // saving one round trip. For number-based lookups we do not know the
  // id upfront so the timestamps query runs alongside formatWithState's
  // RPC state() read instead — same parallel-waterfall trick, one
  // level deeper.
  const timestampsPromise = isHexId
    ? fetchVoteTimestamps(idOrNumber)
    : Promise.resolve<Record<string, number> | null>(null);

  const data = await withRetry(
    () => SubgraphSDK.connect(CHAIN.id).proposals({ where, first: 1 }),
    `getProposalByIdOrNumber(${idOrNumber})`,
  );

  if (!data.proposals || data.proposals.length === 0) {
    return null; // Genuinely not found
  }

  // RPC errors will propagate (not swallowed) so callers can distinguish
  // "not found" (null) from "transient failure" (thrown error)
  const rawProposal = data.proposals[0];
  const [sdkProposal, timestampMapResolved] = await Promise.all([
    formatWithState(rawProposal),
    timestampsPromise.then((m) => m ?? fetchVoteTimestamps(String(rawProposal.proposalId ?? ""))),
  ]);

  const proposal = transformProposal(sdkProposal);

  if (proposal.votes && proposal.votes.length > 0 && timestampMapResolved) {
    proposal.votes = proposal.votes
      .map((v) => ({
        ...v,
        timestamp: timestampMapResolved[v.voter.toLowerCase()] ?? v.timestamp,
      }))
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }

  return proposal;
}

export const getProposalByIdOrNumber = cache(
  async (idOrNumber: string): Promise<Proposal | null> => {
    const isHexId = idOrNumber.startsWith("0x");

    // Canonical per-proposal tag is `proposal:<number>` — the decimal
    // proposalNumber, never the hex id — per docs/architecture/caching-standard.md.
    // Tags must be fixed at unstable_cache wrap time, and for a hex-id
    // lookup we don't know the proposalNumber until *after* the fetch
    // completes, so that path can only be tagged `proposals` (falls back to
    // the 1800s TTL / list invalidation for freshness). This is acceptable:
    // hex-id lookups are internal-only (multi-chain-proposals.ts vote
    // hydration), never the page-route path — pages always call this with
    // the decimal proposalNumber, which gets the precise per-proposal tag.
    const tags: string[] = isHexId
      ? [CACHE_TAGS.proposals]
      : [CACHE_TAGS.proposals, proposalTag(Number.parseInt(idOrNumber, 10))];

    const cached = unstable_cache(
      () => fetchProposalByIdOrNumberUncached(idOrNumber),
      ["proposal-by-id-or-number", idOrNumber],
      { tags, revalidate: 1800 },
    );

    const proposal = await cached();
    return proposal ? rehydrateProposal(proposal) : null;
  },
);
