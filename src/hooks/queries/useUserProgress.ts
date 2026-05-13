import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { progressToNextLevel, streakTier } from "@/lib/gamification/config";

export interface UserProgress {
  xp: number;
  coins: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  freezeTokens: number;
  seasonRp: number;
  seasonTier: string;
  // derived
  levelProgress: { level: number; current: number; needed: number; pct: number };
  streakBadge: { label: string; icon: string } | null;
}

const EMPTY: UserProgress = {
  xp: 0,
  coins: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  freezeTokens: 0,
  seasonRp: 0,
  seasonTier: "bronze",
  levelProgress: { level: 1, current: 0, needed: 100, pct: 0 },
  streakBadge: null,
};

export function useUserProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-progress", user?.id ?? ""],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<UserProgress> => {
      if (!user) return EMPTY;
      const { data } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const r = data as any;
      const xp = r?.xp ?? 0;
      const currentStreak = r?.current_streak ?? 0;
      return {
        xp,
        coins: r?.coins ?? 0,
        level: r?.level ?? 1,
        currentStreak,
        longestStreak: r?.longest_streak ?? 0,
        lastActiveDate: r?.last_active_date ?? null,
        freezeTokens: r?.freeze_tokens ?? 0,
        seasonRp: r?.season_rp ?? 0,
        seasonTier: r?.season_tier ?? "bronze",
        levelProgress: progressToNextLevel(xp),
        streakBadge: streakTier(currentStreak),
      };
    },
  });
}
