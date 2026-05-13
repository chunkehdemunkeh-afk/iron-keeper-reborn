import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyDuels, listChallengeableUsers, createDuel, acceptDuel, declineDuel, cancelDuel,
  recomputeMyDuelProgress, settleDuel,
  type Duel,
} from "@/lib/data/duel-queries";

export function useMyDuels() {
  return useQuery({
    queryKey: ["duels", "mine"],
    queryFn: fetchMyDuels,
    staleTime: 30_000,
  });
}

export function useChallengeableUsers() {
  return useQuery({
    queryKey: ["duels", "challengeable"],
    queryFn: () => listChallengeableUsers(50),
    staleTime: 60_000,
  });
}

export function useDuelMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["duels"] });
  return {
    create: useMutation({ mutationFn: createDuel, onSuccess: invalidate }),
    accept: useMutation({ mutationFn: (id: string) => acceptDuel(id), onSuccess: invalidate }),
    decline: useMutation({ mutationFn: (id: string) => declineDuel(id), onSuccess: invalidate }),
    cancel: useMutation({ mutationFn: (id: string) => cancelDuel(id), onSuccess: invalidate }),
    refresh: useMutation({ mutationFn: (d: Duel) => recomputeMyDuelProgress(d), onSuccess: invalidate }),
    settle: useMutation({ mutationFn: (id: string) => settleDuel(id), onSuccess: invalidate }),
  };
}
