import { formatEther } from "viem";
import { classifyGnarsDiscipline, type GnarsDiscipline } from "@/lib/poidh/keywords";
import type { PoidhBounty } from "@/types/poidh";

/**
 * The homepage showcases the two disciplines the brand is built on. `poidh`'s
 * Gnarly filter is broader than that — it also passes parkour and 420 bounties —
 * so the showcase narrows it again here rather than in the shared service, which
 * other surfaces (the /community/bounties index) still want wide.
 */
export const SHOWCASE_DISCIPLINES: GnarsDiscipline[] = ["skate", "surf"];

/** Short code shown on the card, e.g. `SK8-25`. */
export const DISCIPLINE_CODE: Record<GnarsDiscipline, string> = {
  skate: "SK8",
  surf: "SURF",
  parkour: "PARK",
  weed: "420",
};

export interface ShowcaseBounty {
  bounty: PoidhBounty;
  discipline: GnarsDiscipline;
  eth: number;
}

/**
 * Skate and surf bounties only, richest first. Used by both the server (for the
 * ticker and hero strip totals) and the section itself, so the pool the page
 * advertises is the pool the cards are dealt from.
 */
export function selectShowcaseBounties(bounties: PoidhBounty[]): ShowcaseBounty[] {
  return bounties
    .flatMap((bounty) => {
      const discipline = classifyGnarsDiscipline(
        `${bounty.title || bounty.name} ${bounty.description}`,
      );
      if (!discipline || !SHOWCASE_DISCIPLINES.includes(discipline)) return [];
      return [{ bounty, discipline, eth: Number(formatEther(BigInt(bounty.amount))) }];
    })
    .sort((a, b) => b.eth - a.eth);
}

/** Total ETH across the showcased bounties. */
export function showcasePool(showcase: ShowcaseBounty[]): number {
  return showcase.reduce((sum, s) => sum + s.eth, 0);
}
