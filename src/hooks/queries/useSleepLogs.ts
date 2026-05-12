import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchSleepLogs } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";

export function useSleepLogs(daysBack = 14) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.sleepLogs(user?.id ?? ""),
    queryFn: () => fetchSleepLogs(daysBack),
    enabled: !!user,
    staleTime: 60_000,
  });
}
