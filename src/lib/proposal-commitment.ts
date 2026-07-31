/**
 * Gnars Proposal Commitment — the terms a proposer acknowledges before submitting.
 *
 * ## Versioning (read before editing)
 *
 * `PROPOSAL_COMMITMENT_VERSION` is stamped into every proposal description that
 * goes onchain. Onchain text is permanent: once a proposal is created, that
 * string is the only record of *which* terms the proposer agreed to.
 *
 * Therefore:
 * - **Bump the version** whenever the meaning of the commitment changes — a
 *   clause added, removed, or materially reworded. Past proposals keep pointing
 *   at the version they actually accepted.
 * - **Do not bump** for typo fixes, translation tweaks, or layout changes on
 *   `/propose/terms` that leave every clause's meaning intact.
 * - When bumping, keep the previous version's text reachable (git history is the
 *   minimum; a versioned section on the terms page is better) so an old
 *   acknowledgment can still be resolved to what it meant.
 *
 * The terms URL is hardcoded rather than derived from `BASE_URL` on purpose:
 * preview deploys must not write a preview hostname into permanent onchain text.
 */
export const PROPOSAL_COMMITMENT_VERSION = "v1";

const PROPOSAL_COMMITMENT_URL = "https://www.gnars.com/propose/terms";

/**
 * Footer appended to the proposal description at submission time.
 *
 * Always English, regardless of the proposer's locale — the description is read
 * by the whole DAO and indexed by every Builder frontend, so a single canonical
 * string keeps the record searchable and auditable.
 */
export const PROPOSAL_COMMITMENT_FOOTER = `\n\n---\n\n_Proposer acknowledged the [Gnars Proposal Commitment](${PROPOSAL_COMMITMENT_URL}) (${PROPOSAL_COMMITMENT_VERSION}) on submission._`;

/** Clause ids, in display order. Copy lives in `messages/{locale}/propose.json`. */
export const PROPOSAL_COMMITMENT_CLAUSES = [
  "goodFaith",
  "treasuryRespect",
  "noSilence",
  "proofOfWork",
  "finalReport",
  "openByDefault",
  "proportionalSafeguards",
] as const;
