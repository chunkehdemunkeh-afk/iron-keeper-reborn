import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchPendingSeasonFinale, fetchMyLatestSeasonResult } from "@/lib/data/season-queries";

export function usePendingSeasonFinale() {
  return useQuery({
    queryKey: ["season-finale-pending"],
    queryFn: fetchPendingSeasonFinale,
    staleTime: 60_000,
  });
}

export function useMyLatestSeasonResult() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["season-result-mine", user?.id ?? ""],
    queryFn: () => fetchMyLatestSeasonResult(user!.id),
    enabled: !!user?.id,
  });
}
