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
  query SettledAuctionIds($dao: String!) {
    auctions(where: { dao: $dao, settled: true }, first: 1000) {
      id
    }
  }
`;

/**
 * Count of settled auctions. The subgraph pages at 1000, so this saturates
 * there — at the DAO's ~1/day cadence that is years away, and the KPI note
 * degrades to "1000 auctions settled", not a wrong number. `0` = count
 * unavailable; callers omit the note rather than claiming zero history.
 */
export const fetchSettledAuctionCount = cache(async (): Promise<number> => {
  try {
    const data = await subgraphQuery<{ auctions?: Array<{ id: string }> }>(
      SETTLED_AUCTION_IDS_GQL,
      { dao: DAO_ADDRESSES.token.toLowerCase() },
    );
    return data.auctions?.length ?? 0;
  } catch {
    return 0;
  }
});
