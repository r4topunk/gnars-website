import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listPropdates,
  createPropdate,
} from "@/services/propdates";

export function usePropdates(proposalId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["propdates", proposalId],
    queryFn: () => listPropdates(proposalId),
    enabled: Boolean(proposalId),
  });

  const create = useMutation({
    mutationFn: (input: { proposalId: string; messageText: string }) =>
      createPropdate(input.proposalId, input.messageText),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["propdates", variables.proposalId] });
    },
  });

  return {
    propdates: query.data,
    isLoading: query.isLoading,
    isError: query.error,
    refetch: query.refetch,
    createPropdate: create.mutate,
    isCreating: create.isPending,
  };
}

export function usePropdatesList(proposalIds: string[]) {
  return useQuery({
    queryKey: ["propdates-list", proposalIds],
    queryFn: async () => {
      const results = await Promise.all(proposalIds.map(listPropdates));
      return results.flat();
    },
    enabled: proposalIds.length > 0,
  });
}
