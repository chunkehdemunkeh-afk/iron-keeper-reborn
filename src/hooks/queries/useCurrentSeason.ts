import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Season {
  id: string;
  number: number;
  starts_at: string;
  ends_at: string;
  status: string;
  theme?: string | null;
  theme_gradient?: string | null;
}

export function useCurrentSeason() {
  return useQuery({
    queryKey: ["current-season"],
    queryFn: async (): Promise<Season | null> => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("status", "active")
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Season | null;
    },
    staleTime: 5 * 60_000,
  });
}

export function daysRemaining(season: Season | null | undefined): number {
  if (!season) return 0;
  const ms = new Date(season.ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
