import { useQuery } from "@tanstack/react-query";

export type ProposalMonthPoint = {
  month: string;
  count: number;
};

async function fetchProposalsPerMonth(months: number): Promise<ProposalMonthPoint[]> {
  const response = await fetch(`/api/proposals/per-month?months=${months}`);
  
  if (!response.ok) {
    throw new Error("Failed to fetch proposals per month");
  }

  const result = await response.json();
  return result.data || [];
}

export function useProposalsPerMonth(months: number = 12) {
  return useQuery({
    queryKey: ["proposals-per-month", months],
    queryFn: () => fetchProposalsPerMonth(months),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

