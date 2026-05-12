import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchWorkoutHistory } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";

export function useWorkoutHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.workoutHistory(user?.id ?? ""),
    queryFn: fetchWorkoutHistory,
    enabled: !!user,
  });
}
