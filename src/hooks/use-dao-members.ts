import { useQuery } from "@tanstack/react-query";
import { GNARS_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";

const DAO_MEMBERS_QUERY = /* GraphQL */ `
  query DaoMembersList($dao: ID!, $first: Int!, $skip: Int!) {
    daotokenOwners(
      where: { dao: $dao }
      orderBy: daoTokenCount
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      owner
      delegate
    }
  }
`;

interface DaoTokenOwner {
  owner: string;
  delegate: string;
}

export function useDaoMembers() {
  return useQuery({
    queryKey: ["dao-members", GNARS_ADDRESSES.token],
    queryFn: async () => {
      const dao = GNARS_ADDRESSES.token.toLowerCase();
      const PAGE_SIZE = 1000;
      const addresses = new Set<string>();
      let skip = 0;

      while (true) {
        const result = await subgraphQuery<{
          daotokenOwners: DaoTokenOwner[];
        }>(DAO_MEMBERS_QUERY, { dao, first: PAGE_SIZE, skip });
        const owners = result.daotokenOwners ?? [];
        if (owners.length === 0) break;

        for (const member of owners) {
          if (member.owner) addresses.add(member.owner.toLowerCase());
          if (member.delegate) addresses.add(member.delegate.toLowerCase());
        }

        if (owners.length < PAGE_SIZE) break;
        skip += PAGE_SIZE;
      }

      return addresses;
    },
    staleTime: 5 * 60 * 1000,
  });
}
