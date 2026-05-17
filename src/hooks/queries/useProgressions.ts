import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchAllProgressions,
  fetchPendingProgressions,
  acceptProgression,
  dismissProgression,
  type ProgressionRow,
} from "@/lib/data/progression-queries";
import { toast } from "sonner";
import { hapticSuccess } from "@/lib/haptics";

export function useProgressions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.progressions(user?.id ?? "anon"),
    queryFn: fetchAllProgressions,
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function usePendingProgressions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.pendingProgressions(user?.id ?? "anon"),
    queryFn: fetchPendingProgressions,
    enabled: !!user,
    staleTime: 30_000,
  });
}

/** Build an exerciseId → ProgressionRow map for quick lookups in WorkoutSession. */
export function progressionMap(rows: ProgressionRow[] | undefined): Record<string, ProgressionRow> {
  const out: Record<string, ProgressionRow> = {};
  (rows ?? []).forEach(r => { out[r.exerciseId] = r; });
  return out;
}

export function useProgressionActions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => {
    if (!user) return;
    qc.invalidateQueries({ queryKey: queryKeys.progressions(user.id) });
    qc.invalidateQueries({ queryKey: queryKeys.pendingProgressions(user.id) });
  };

  const accept = useMutation({
    mutationFn: (exerciseId: string) => acceptProgression(exerciseId),
    onSuccess: () => {
      hapticSuccess();
      toast.success("Progression applied 💪");
      invalidate();
    },
  });

  const dismiss = useMutation({
    mutationFn: (exerciseId: string) => dismissProgression(exerciseId),
    onSuccess: () => {
      toast("Suggestion dismissed");
      invalidate();
    },
  });

  return { accept: accept.mutate, dismiss: dismiss.mutate };
}
