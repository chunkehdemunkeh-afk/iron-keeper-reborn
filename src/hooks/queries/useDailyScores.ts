import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchDailyScores, fetchTodayScore } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";

/** Today's single score record — for the home/recovery cards. */
export function useTodayScore(options?: { staleTime?: number }) {
  const { user } = useAuth();
  const date = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: queryKeys.dailyScores(user?.id ?? "", date),
    queryFn: fetchTodayScore,
    enabled: !!user,
    staleTime: options?.staleTime ?? 60_000,
  });
}

/** Rolling window of score records — for trend charts and detail sheets. */
export function useDailyScores(daysBack = 14, options?: { range?: string; enabled?: boolean; staleTime?: number }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.dailyScores(user?.id ?? "", options?.range ?? `${daysBack}d`),
    queryFn: () => fetchDailyScores(daysBack),
    enabled: (options?.enabled ?? true) && !!user,
    staleTime: options?.staleTime ?? 120_000,
  });
}
