import { cache } from "react";
import { GNARS_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";

export type DaoStats = {
  totalSupply: number;
  ownerCount: number;
};

type DaoQuery = {
  dao: {
    id: string;
    totalSupply: number;
    ownerCount: number;
  } | null;
};

const DAO_GQL = /* GraphQL */ `
  query Dao($id: ID!) {
    dao(id: $id) {
      id
      totalSupply
      ownerCount
    }
  }
`;

export const fetchDaoStats = cache(async (): Promise<DaoStats> => {
  const id = GNARS_ADDRESSES.token.toLowerCase();
  const data = await subgraphQuery<DaoQuery>(DAO_GQL, { id });
  return {
    totalSupply: Number(data.dao?.totalSupply ?? 0),
    ownerCount: Number(data.dao?.ownerCount ?? 0),
  };
});

type DaoSalesQuery = {
  dao: {
    totalAuctionSales: string;
  } | null;
};

const DAO_TOTAL_AUCTION_SALES_GQL = /* GraphQL */ `
  query TotalAuctionSales($id: ID!) {
    dao(id: $id) {
      totalAuctionSales
    }
  }
`;

export const fetchTotalAuctionSalesWei = cache(async (): Promise<bigint> => {
  const id = GNARS_ADDRESSES.token.toLowerCase();
  const data = await subgraphQuery<DaoSalesQuery>(DAO_TOTAL_AUCTION_SALES_GQL, { id });
  const wei = data.dao?.totalAuctionSales ?? "0";
  try {
    return BigInt(wei);
  } catch {
    return BigInt(0);
  }
});
