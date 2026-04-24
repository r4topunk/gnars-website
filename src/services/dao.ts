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
