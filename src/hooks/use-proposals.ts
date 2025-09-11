import { getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { useQuery } from "@tanstack/react-query";

import { Proposal } from "@/components/proposals/types";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { mapProposal } from "@/lib/proposal-utils";

async function fetchProposals(): Promise<Proposal[]> {
  const { proposals: sdkProposals } = await getProposals(
    CHAIN.id,
    GNARS_ADDRESSES.token,
    200
  );
  return ((sdkProposals as SdkProposal[] | undefined) ?? []).map(mapProposal);
}

export function useProposals() {
  return useQuery<Proposal[]>({
    queryKey: ["proposals"],
    queryFn: fetchProposals,
  });
}
