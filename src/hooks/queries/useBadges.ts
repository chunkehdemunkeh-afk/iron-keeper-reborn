import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface BadgeWithUnlock {
  code: string;
  name: string;
  description: string;
  category: string;
  tier: "bronze" | "silver" | "gold";
  icon: string;
  xp_reward: number;
  coin_reward: number;
  criteria: { type: string; value: number };
  hidden: boolean;
  unlockedAt: string | null;
}

export function useBadges() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-badges", user?.id ?? ""],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<BadgeWithUnlock[]> => {
      if (!user) return [];
      const [{ data: catalog }, { data: owned }] = await Promise.all([
        supabase.from("badges").select("*"),
        supabase.from("user_badges").select("badge_code, unlocked_at").eq("user_id", user.id),
      ]);
      const ownedMap = new Map<string, string>(
        (owned ?? []).map((r: any) => [r.badge_code, r.unlocked_at]),
      );
      return ((catalog ?? []) as any[]).map((b) => ({
        ...b,
        unlockedAt: ownedMap.get(b.code) ?? null,
      }));
    },
  });
}

export interface XpEvent {
  id: string;
  source: string;
  xp: number;
  coins: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useRecentXpEvents(limit = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["xp-events", user?.id ?? "", limit],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<XpEvent[]> => {
      if (!user) return [];
      const { data } = await supabase
        .from("xp_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data ?? []) as XpEvent[];
    },
  });
}
