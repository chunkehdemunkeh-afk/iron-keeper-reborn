import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchCoachFeed,
  fetchRosterStats,
  fetchAthleteSessions,
  acknowledgeSession,
  unacknowledgeSession,
} from "@/lib/data/coach-feed-queries";
import { toast } from "sonner";
import { hapticSuccess } from "@/lib/haptics";

export function useCoachFeed() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.coachFeed(user?.id ?? ""),
    queryFn: () => fetchCoachFeed(60),
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useRosterStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.coachRosterStats(user?.id ?? ""),
    queryFn: fetchRosterStats,
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useAthleteSessions(athleteId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.coachAthleteSessions(user?.id ?? "", athleteId ?? ""),
    queryFn: () => fetchAthleteSessions(athleteId!),
    enabled: !!user && !!athleteId,
    staleTime: 30_000,
  });
}

export function useSessionReview() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["coach-feed"] });
    qc.invalidateQueries({ queryKey: ["coach-athlete-sessions"] });
  };

  const acknowledge = useMutation({
    mutationFn: async ({ sessionId, athleteId }: { sessionId: string; athleteId: string }) => {
      const { error } = await acknowledgeSession(sessionId, athleteId);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      hapticSuccess();
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const undo = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await unacknowledgeSession(sessionId);
      if (error) throw new Error(error);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return { acknowledge, undo };
}
