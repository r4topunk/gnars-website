import type { Proposal } from "@/components/proposals/types";
import { extractFirstUrl } from "@/components/proposals/utils";

/**
 * Max characters of stripped-markdown description kept for the list payload.
 * Enough for the client-side search index to match intro text without
 * shipping full proposal bodies (average body is ~5KB of markdown).
 */
const DESCRIPTION_EXCERPT_LENGTH = 600;

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#>*_~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Slim a proposal for list rendering (grids/cards). Full descriptions and
 * vote arrays account for ~87% of the list RSC payload (measured 1.3MB for
 * 123 proposals), which Vercel bills as ISR write units on every
 * revalidation and as origin transfer on every miss.
 *
 * - `bannerImageUrl` is precomputed here because cards only use the
 *   description to extract the first image URL.
 * - `description` is reduced to a plain-text excerpt so the search worker
 *   can still match intro text.
 * - `votes` is dropped entirely; list UIs only read the aggregate
 *   for/against/abstain counters.
 *
 * Detail pages must keep using the full proposal from the service layer.
 */
export function toListProposal<T extends Proposal>(proposal: T): T {
  return {
    ...proposal,
    bannerImageUrl: extractFirstUrl(proposal.description),
    description: stripMarkdown(proposal.description).slice(0, DESCRIPTION_EXCERPT_LENGTH),
    votes: undefined,
  };
}
