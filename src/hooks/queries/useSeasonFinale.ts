import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchPendingSeasonFinale,
  fetchMyLatestSeasonResult,
  fetchSeasonObjectives,
  fetchCosmeticsUnlockedInSeason,
} from "@/lib/data/season-queries";

export function usePendingSeasonFinale() {
  return useQuery({
    queryKey: ["season-finale-pending"],
    queryFn: fetchPendingSeasonFinale,
    staleTime: 60_000,
  });
}

export function useMyLatestSeasonResult() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["season-result-mine", user?.id ?? ""],
    queryFn: () => fetchMyLatestSeasonResult(user!.id),
    enabled: !!user?.id,
  });
}

export function useSeasonObjectives(seasonStart: string | undefined) {
  return useQuery({
    queryKey: ["season-objectives", seasonStart ?? ""],
    queryFn: () => fetchSeasonObjectives(seasonStart!),
    enabled: !!seasonStart,
    staleTime: 30_000,
  });
}

export function useCosmeticsUnlockedInSeason(seasonStart: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cosmetics-unlocked-season", user?.id ?? "", seasonStart ?? ""],
    queryFn: () => fetchCosmeticsUnlockedInSeason(user!.id, seasonStart!),
    enabled: !!user?.id && !!seasonStart,
    staleTime: 30_000,
  });
}
