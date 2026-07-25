import type { RiderId } from "@/lib/gnars-vaults";

// Custom one-liners per skater for the stake dialog speech bubble.
//
// Leave a rider's array empty to fall back to the generic contextual lines
// (opp.lineEmpty / lineBig / lineStable / lineVar in the stake messages). When a
// rider has entries here, they replace the "flavor" line — the empty-bag and
// big-bag prompts stay generic since they're functional cues.
//
// These are the skater's OWN voice — plain strings, written however the skater
// wants (any language). Real riders will supply their own; drop their sentences
// straight into the array. Keep them short (they type out one character at a
// time in a small bubble).
export const RIDER_LINES: Record<RiderId, string[]> = {
  vlad: ["If you stake with me, you can always ask a puff of my joints"],
  yan: [],
  r4to: [],
  pamtech: [],
  v2: [],
  zima: [],
};

/** A rider's custom flavor line for this context, or null to use the generic one. */
export function riderCustomLine(id: string, seed: number): string | null {
  const lines = RIDER_LINES[id as RiderId];
  if (!lines || lines.length === 0) return null;
  return lines[Math.abs(seed) % lines.length];
}
