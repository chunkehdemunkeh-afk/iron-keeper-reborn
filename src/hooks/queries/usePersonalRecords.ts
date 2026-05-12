import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchPersonalRecords } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";

export function usePersonalRecords(options?: { staleTime?: number }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.personalRecords(user?.id ?? ""),
    queryFn: fetchPersonalRecords,
    enabled: !!user,
    staleTime: options?.staleTime,
  });
}
