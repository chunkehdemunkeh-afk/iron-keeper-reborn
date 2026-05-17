import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/query-keys";
import { fetchWeeklyMuscleData } from "@/lib/data/volume-queries";
import type { WeeklyMuscleData } from "@/lib/data/volume-queries";

export function useWeeklyMuscleVolume(weeksBack = 4) {
  const { user } = useAuth();
  return useQuery<WeeklyMuscleData[]>({
    queryKey: queryKeys.muscleVolume(user?.id ?? ""),
    queryFn: () => fetchWeeklyMuscleData(weeksBack),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}
