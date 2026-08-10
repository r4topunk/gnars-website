import { getTranslations } from "next-intl/server";
import { FALLBACK_CHANNELS, toChannels } from "@/components/tv/gnars-tv-channels";
import { GnarsTVSet } from "@/components/tv/GnarsTVSet";
import { NOGGLES_RAILS } from "@/content/nogglesrails";
import { DAO_ADDRESSES } from "@/lib/config";
import { fetchDaoStats } from "@/services/dao";
import { fetchDroposals, resolveDroposalTokenAddress } from "@/services/droposals";
import { loadTreasurySnapshot } from "@/services/treasury";

function compact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

/**
 * The homepage hero: the Gnars TV set, fed with real executed droposals.
 *
 * Channels are resolved on the server so the guide's titles, prices and cover
 * art are in the first paint rather than popping in — the set is the first thing
 * on the page, and a television that boots empty is worse than no television.
 * A failing droposal service degrades to the hardcoded guide.
 */
export async function TVHeroSection() {
  const t = await getTranslations("newhome.ticker");

  const [droposals, daoStats, treasury] = await Promise.all([
    fetchDroposals(24).catch(() => []),
    fetchDaoStats().catch(() => ({ totalSupply: 0, ownerCount: 0 })),
    loadTreasurySnapshot(DAO_ADDRESSES.treasury).catch(() => ({
      usdTotal: null,
      ethBalance: 0,
      totalAuctionSales: 0,
    })),
  ]);

  const base = droposals.length > 0 ? toChannels(droposals) : FALLBACK_CHANNELS;

  // MINT collects from the edition contract, and the subgraph does not carry it,
  // so it is recovered from each droposal's execution receipt here — on the
  // server, in parallel, cached for the page's revalidate window. A channel that
  // will not resolve simply has no mintable address and the key routes instead.
  const byProposal = new Map(droposals.map((d) => [d.proposalNumber, d]));
  const channels = await Promise.all(
    base.map(async (c) => {
      if (c.collectionAddress) return c;
      const hash = byProposal.get(c.propNumber)?.executionTransactionHash;
      const collectionAddress = await resolveDroposalTokenAddress(hash);
      return collectionAddress ? { ...c, collectionAddress } : c;
    }),
  );

  const railCount = NOGGLES_RAILS.length;
  const countryCount = new Set(NOGGLES_RAILS.map((r) => r.country)).size;
  const treasuryLabel = treasury.usdTotal == null ? "—" : compact(treasury.usdTotal);

  // Two rows so the ticker never reads as one long loop; each scrolls at its own
  // rate, which is what makes a marquee look mechanical rather than animated.
  const ticker: [string[], string[]] = [
    [
      `RAILS ${railCount} BUILT ${countryCount} COUNTRIES`,
      `MEMBERS ${daoStats.ownerCount}`,
      `AUCTION ${treasury.totalAuctionSales.toFixed(1)} ETH`,
      t("cc0"),
    ],
    [
      `TREASURY ${treasuryLabel}`,
      `GNARS ${daoStats.totalSupply}`,
      `CHANNELS ${channels.length}`,
      "1 GNAR = 1 VOTE",
    ],
  ];

  return <GnarsTVSet channels={channels} ticker={ticker} />;
}
