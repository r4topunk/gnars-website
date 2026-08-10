/**
 * Shared bits of the governance panel's look.
 *
 * The panel is one composition — auction, proposals and feed — so the gold
 * ramp, the vote colours and the identity gradients live here rather than being
 * re-typed (and slowly diverging) in three components.
 */

/** The auction's gold ramp, used for the bid figure, the CTA and the live badge. */
export const GOLD = "linear-gradient(90deg,#f7c948,#f5851f)";

export const VOTE_COLOR = {
  for: "#4ade80",
  against: "#f87171",
  abstain: "#a3a3a3",
} as const;

/**
 * Pairs an address with a stable pair of hues.
 *
 * The feed and the leaderboard identify people by a coloured disc, so the same
 * wallet has to land on the same colours every render and across both lists —
 * a random gradient would make the disc meaningless as identity. Hashing the
 * address gives that for free, with no avatar fetch.
 */
const AVATAR_HUES: Array<[string, string]> = [
  ["#f472b6", "#f7c948"],
  ["#4ade80", "#22d3ee"],
  ["#fb923c", "#f472b6"],
  ["#60a5fa", "#818cf8"],
  ["#f472b6", "#c084fc"],
  ["#f7c948", "#7B2DFF"],
  ["#4ade80", "#0066FF"],
  ["#FF6383", "#f5851f"],
];

export function avatarGradient(address: string): string {
  let hash = 0;
  for (let i = 0; i < address.length; i += 1) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  const [from, to] = AVATAR_HUES[hash % AVATAR_HUES.length];
  return `linear-gradient(135deg,${from},${to})`;
}

/** `0xDB1…62cdf` — the truncation the reference uses for both lists. */
export function truncateAddress(address: string): string {
  if (address.length <= 11) return address;
  return `${address.slice(0, 5)}…${address.slice(-5)}`;
}

/** Compact relative age: `2d`, `14d`, `3h`, `12m`. */
export function shortAge(timestampMs: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - timestampMs) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
