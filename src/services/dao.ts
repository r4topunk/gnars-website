import { cache } from "react";
import { DAO_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";

export type DaoStats = {
  totalSupply: number;
  ownerCount: number;
};

export type DaoOverview = DaoStats & {
  totalAuctionSalesWei: bigint;
};

type DaoOverviewQuery = {
  dao: {
    id: string;
    totalSupply: number;
    ownerCount: number;
    totalAuctionSales: string | null;
  } | null;
};

// Single query covering every `dao(id)` read currently scattered across
// fetchDaoStats + fetchTotalAuctionSalesWei. React `cache()` dedupes
// within a request so callers still see per-request memoization.
const DAO_OVERVIEW_GQL = /* GraphQL */ `
  query DaoOverview($id: ID!) {
    dao(id: $id) {
      id
      totalSupply
      ownerCount
      totalAuctionSales
    }
  }
`;

function safeBigInt(value: string | null | undefined): bigint {
  try {
    return BigInt(value ?? "0");
  } catch {
    return BigInt(0);
  }
}

export const fetchDaoOverview = cache(async (): Promise<DaoOverview> => {
  const id = DAO_ADDRESSES.token.toLowerCase();
  const data = await subgraphQuery<DaoOverviewQuery>(DAO_OVERVIEW_GQL, { id });
  return {
    totalSupply: Number(data.dao?.totalSupply ?? 0),
    ownerCount: Number(data.dao?.ownerCount ?? 0),
    totalAuctionSalesWei: safeBigInt(data.dao?.totalAuctionSales),
  };
});

export const fetchDaoStats = cache(async (): Promise<DaoStats> => {
  const { totalSupply, ownerCount } = await fetchDaoOverview();
  return { totalSupply, ownerCount };
});

export const fetchTotalAuctionSalesWei = cache(async (): Promise<bigint> => {
  const { totalAuctionSalesWei } = await fetchDaoOverview();
  return totalAuctionSalesWei;
});

const SETTLED_AUCTION_IDS_GQL = /* GraphQL */ `
  query SettledAuctionIds($dao: String!, $after: ID!) {
    auctions(
      where: { dao: $dao, settled: true, id_gt: $after }
      first: 1000
      orderBy: id
      orderDirection: asc
    ) {
      id
    }
  }
`;

/**
 * Count of settled auctions. There is no aggregate on the DAO entity (and
 * `tokensCount` counts founder mints too), so this cursors through id-only
 * pages — ~8 requests for Gnars' ~7k auctions, refreshed at the page's ISR
 * cadence. The 20-page guard is a runaway stop, not an expected ceiling.
 * `0` = count unavailable; callers omit the note rather than claiming zero.
 */
export const fetchSettledAuctionCount = cache(async (): Promise<number> => {
  try {
    const dao = DAO_ADDRESSES.token.toLowerCase();
    let count = 0;
    let after = "";
    for (let page = 0; page < 20; page += 1) {
      const data = await subgraphQuery<{ auctions?: Array<{ id: string }> }>(
        SETTLED_AUCTION_IDS_GQL,
        { dao, after },
      );
      const ids = data.auctions ?? [];
      count += ids.length;
      if (ids.length < 1000) return count;
      after = ids[ids.length - 1].id;
    }
    return count;
  } catch {
    return 0;
  }
});
