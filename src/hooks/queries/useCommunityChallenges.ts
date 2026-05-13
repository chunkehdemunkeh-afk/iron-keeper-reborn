import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchActiveCommunityChallenges, fetchChallengeStats } from "@/lib/data/community-queries";

export function useCommunityChallenges() {
  return useQuery({
    queryKey: ["community-challenges"],
    queryFn: fetchActiveCommunityChallenges,
    staleTime: 30_000,
  });
}

export function useChallengeStats(challengeId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["challenge-stats", challengeId ?? "", user?.id ?? ""],
    queryFn: () => fetchChallengeStats(challengeId!, user!.id),
    enabled: !!challengeId && !!user?.id,
    staleTime: 15_000,
  });
}
