import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchRunSessionHistory } from "@/lib/data/run-history-queries";

export function useRunSessionHistory(goalPaceSecPerKm: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["run-session-history", user?.id ?? "", Math.round(goalPaceSecPerKm)],
    queryFn: () => fetchRunSessionHistory(goalPaceSecPerKm),
    enabled: !!user,
    staleTime: 60_000,
  });
}
