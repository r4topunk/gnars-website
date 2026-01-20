"use client";

import { useReadContract } from "wagmi";
import { gnarsGovernorAbi } from "@/utils/abis/gnarsGovernorAbi";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";

/**
 * Hook to read the ETA (execution timestamp) for a queued proposal
 * The ETA is set when queue() is called and represents the earliest time the proposal can be executed
 */
export function useProposalEta(proposalId?: string) {
  const { data: eta, isLoading, isError } = useReadContract({
    address: GNARS_ADDRESSES.governor as `0x${string}`,
    abi: gnarsGovernorAbi,
    functionName: "proposalEta",
    args: proposalId ? [proposalId as `0x${string}`] : undefined,
    chainId: CHAIN.id,
    query: {
      enabled: !!proposalId,
    },
  });

  return {
    eta: eta ? Number(eta) : null,
    isLoading,
    isError,
    etaDate: eta && eta > 0n ? new Date(Number(eta) * 1000) : null,
  };
}
