import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchStrengthProfile } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";

export function useStrengthProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.strengthProfile(user?.id ?? ""),
    queryFn: fetchStrengthProfile,
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}
