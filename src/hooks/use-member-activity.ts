import { getProposals } from "@buildeross/sdk";
import { useQuery } from "@tanstack/react-query";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";

export type ProposalWithVotes = {
  proposalNumber: number;
  timeCreated: number;
  voterCount: number;
};

export type MemberActivityData = {
  proposal: string;
  proposalNumber: number;
  voters: number;
};

type SdkVote = {
  voter?: string | null;
};

type MinimalSdkProposal = {
  votes?: unknown;
  state?: number | string | null;
  cancelTransactionHash?: unknown;
  proposalNumber?: number | string | null;
  timeCreated?: number | string | null;
};

async function fetchRecentProposalsWithVoters(limit: number): Promise<ProposalWithVotes[]> {
  const { proposals } = await getProposals(CHAIN.id, GNARS_ADDRESSES.token, limit);
  const list = (proposals as MinimalSdkProposal[] | undefined) ?? [];

  return list
    .map<ProposalWithVotes & { _isCanceled: boolean }>((p) => {
      const rawVotes = Array.isArray(p.votes) ? p.votes : [];
      const votes: SdkVote[] = rawVotes as SdkVote[];
      const uniqueVoters = new Set<string>();

      for (const vote of votes) {
        const voter = vote?.voter;
        if (voter) uniqueVoters.add(String(voter).toLowerCase());
      }

      const rawState = p.state;
      const hasCancelTx = Boolean(p.cancelTransactionHash);
      const isCanceledByState =
        typeof rawState === "number"
          ? rawState === 2
          : String(rawState ?? "")
              .toUpperCase()
              .includes("CANCEL");
      const isCanceled = hasCancelTx || isCanceledByState;

      return {
        proposalNumber: Number(p.proposalNumber ?? 0),
        timeCreated: Number(p.timeCreated ?? 0),
        voterCount: uniqueVoters.size,
        _isCanceled: isCanceled,
      };
    })
    .filter((row) => !row._isCanceled)
    .sort((a, b) => b.timeCreated - a.timeCreated);
}

export function useMemberActivity(limit: number = 12) {
  return useQuery({
    queryKey: ["member-activity", limit],
    queryFn: () => fetchRecentProposalsWithVoters(limit),
    select: (data) => {
      return data
        .slice(0, 12)
        .reverse() // oldest to newest for nicer left-to-right feel
        .map(
          (r): MemberActivityData => ({
            proposal: `Prop #${r.proposalNumber}`,
            proposalNumber: r.proposalNumber,
            voters: r.voterCount,
          }),
        );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
