import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyDuels, listChallengeableUsers, createDuel, acceptDuel, declineDuel, cancelDuel,
  recomputeMyDuelProgress, settleDuel,
  type Duel,
} from "@/lib/data/duel-queries";
import { toast } from "sonner";

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
  // duel-queries.ts throws on Supabase errors, but with no onError anywhere
  // these mutations previously failed silently — the button click just did
  // nothing visible. Callers can still layer a more specific onError/onSuccess
  // via mutate()'s second argument; TanStack Query runs both.
  const onError = () => toast.error("That didn't go through — try again");
  return {
    create: useMutation({ mutationFn: createDuel, onSuccess: invalidate, onError }),
    accept: useMutation({ mutationFn: (id: string) => acceptDuel(id), onSuccess: invalidate, onError }),
    decline: useMutation({ mutationFn: (id: string) => declineDuel(id), onSuccess: invalidate, onError }),
    cancel: useMutation({ mutationFn: (id: string) => cancelDuel(id), onSuccess: invalidate, onError }),
    refresh: useMutation({ mutationFn: (d: Duel) => recomputeMyDuelProgress(d), onSuccess: invalidate, onError }),
    settle: useMutation({ mutationFn: (id: string) => settleDuel(id), onSuccess: invalidate, onError }),
  };
}
