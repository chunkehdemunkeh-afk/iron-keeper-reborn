import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchDailyBiometrics } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";

export function useDailyBiometrics(daysBack = 2, options?: { range?: string; enabled?: boolean; staleTime?: number }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.dailyBiometrics(user?.id ?? "", options?.range),
    queryFn: () => fetchDailyBiometrics(daysBack),
    enabled: (options?.enabled ?? true) && !!user,
    staleTime: options?.staleTime ?? 60_000,
  });
}
