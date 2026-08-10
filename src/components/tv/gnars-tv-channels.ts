import type { DroposalListItem } from "@/services/droposals";

export interface TVChannel {
  /** 1-based position in the guide. */
  no: number;
  title: string;
  propNumber: number;
  priceEth: string;
  /** IPFS gateway URL of the droposal's animation, when it has one. */
  videoUrl?: string;
  /** IPFS gateway URL of the cover art. Doubles as the video poster. */
  thumbUrl?: string;
  /** Zora edition contract — what MINT collects from. */
  collectionAddress?: string;
  tokenId: string;
}

/**
 * Channels when the droposal service is unreachable.
 *
 * Real executed droposals with their real proposal numbers and edition prices,
 * so an outage degrades to a stale guide rather than an empty television. The
 * first five carry known-good animation CIDs; the rest are poster-only and fall
 * back to the Ken-Burns still.
 */
const FALLBACK: Array<Omit<TVChannel, "no">> = [
  {
    title: "Gnargentina",
    propNumber: 110,
    priceEth: "0.005",
    videoUrl: "https://ipfs.io/ipfs/QmfQydzfV5i3JgQ4SDQ3XXkBy4mDBufAJjD596NxPvwMfs",
    tokenId: "1",
  },
  {
    title: "Surf is Up — Nogglesboard",
    propNumber: 100,
    priceEth: "0.0025",
    videoUrl: "https://ipfs.io/ipfs/QmbHbVzFTNSFpFUXHyKBrtGfJ3era6SpkQBjEEpzapeNex",
    tokenId: "1",
  },
  {
    title: "ska7e & jam",
    propNumber: 98,
    priceEth: "0.0035",
    videoUrl: "https://ipfs.io/ipfs/Qmcj9mcaXkiNU8s3KCY9JMVAhacFJZvUXngYbPVx44R8uG",
    tokenId: "1",
  },
  {
    title: "Gnars is Burning",
    propNumber: 93,
    priceEth: "0.0035",
    videoUrl: "https://ipfs.io/ipfs/Qmb3Q2YigQe9SkQWmPX81PefBLsUGk7jh52WoEAvT5x6MD",
    tokenId: "1",
  },
  {
    title: "Noggles Day Out",
    propNumber: 88,
    priceEth: "0.005",
    videoUrl: "https://ipfs.io/ipfs/bafybeigywbj5wtyhdio3jpdmhtawp6b5r46xpo7vtadayd3exp4aivrih4",
    tokenId: "1",
  },
  { title: "Uganda Connection", propNumber: 81, priceEth: "0.005", tokenId: "1" },
  { title: "Nogglesboard", propNumber: 74, priceEth: "0.003", tokenId: "1" },
  { title: "Gnars Japan", propNumber: 69, priceEth: "0.003", tokenId: "1" },
];

export const FALLBACK_CHANNELS: TVChannel[] = FALLBACK.map((c, i) => ({ ...c, no: i + 1 }));

/** How many droposals the guide lists before it would need to page. */
const MAX_CHANNELS = 12;

/**
 * Turns executed droposals into channels, newest proposal first.
 *
 * A droposal with neither animation nor cover art has nothing to broadcast, so
 * it is dropped rather than tuning to a black screen. If that leaves nothing at
 * all, the fallback guide stands in.
 */
export function toChannels(droposals: DroposalListItem[]): TVChannel[] {
  const channels = droposals
    .filter((d) => d.animationUrl || d.bannerImage)
    .sort((a, b) => b.proposalNumber - a.proposalNumber)
    .slice(0, MAX_CHANNELS)
    .map<TVChannel>((d, i) => ({
      no: i + 1,
      title: d.name || d.title || `Droposal #${d.proposalNumber}`,
      propNumber: d.proposalNumber,
      priceEth: d.priceEth ?? "0",
      videoUrl: d.animationUrl,
      thumbUrl: d.bannerImage,
      collectionAddress: d.tokenAddress,
      // Zora editions mint sequentially from #1; the guide only ever links to
      // the edition contract, so the id is nominal.
      tokenId: "1",
    }));

  return channels.length > 0 ? channels : FALLBACK_CHANNELS;
}
