/**
 * Canonical cache tag constants for `unstable_cache` (services) and
 * `revalidateTag` (mutation hooks + `/api/revalidate`).
 *
 * See docs/architecture/caching-standard.md Rule 2 for the full tag → TTL
 * table. Tags are the freshness mechanism; TTLs on the wrapped reads are a
 * backstop only.
 */
export const CACHE_TAGS = {
  proposals: "proposals",
  feed: "feed",
  auction: "auction",
  auctions: "auctions",
  members: "members",
  treasury: "treasury",
  propdates: "propdates",
  rounds: "rounds",
} as const;

export type StaticCacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

const STATIC_TAGS: ReadonlySet<string> = new Set(Object.values(CACHE_TAGS));

/** Dynamic per-proposal tag. Canonical format: `proposal:<number>` — the
 * decimal `proposalNumber`, never the hex `proposalId`. */
export function proposalTag(proposalNumber: number): string {
  return `proposal:${proposalNumber}`;
}

/** Dynamic per-round tag. Canonical format: `round:<slug>`. */
export function roundTag(slug: string): string {
  return `round:${slug}`;
}

const PROPOSAL_TAG_RE = /^proposal:\d+$/;
const ROUND_TAG_RE = /^round:[a-z0-9-]+$/;

/**
 * Allowlist check used by `/api/revalidate` (and safe to reuse anywhere a
 * caller-supplied tag needs validating before being passed to
 * `revalidateTag`). Accepts the static tags above plus the two dynamic tag
 * shapes (`proposal:<n>`, `round:<slug>`).
 */
export function isAllowedRevalidateTag(tag: string): boolean {
  return STATIC_TAGS.has(tag) || PROPOSAL_TAG_RE.test(tag) || ROUND_TAG_RE.test(tag);
}
