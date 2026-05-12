import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchRecentSets } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";

export function useRecentSets(daysBack = 7) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.recentSets(user?.id ?? ""),
    queryFn: () => fetchRecentSets(daysBack),
    enabled: !!user,
    staleTime: 60_000,
  });
}
