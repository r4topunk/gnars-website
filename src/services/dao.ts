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

export async function fetchDaoStats(): Promise<DaoStats> {
  const id = GNARS_ADDRESSES.token.toLowerCase();
  const data = await subgraphQuery<DaoQuery>(DAO_GQL, { id });
  return {
    totalSupply: Number(data.dao?.totalSupply ?? 0),
    ownerCount: Number(data.dao?.ownerCount ?? 0),
  };
}


