import { useQuery } from "@tanstack/react-query";
import { fetchActiveQuests } from "@/lib/data/quest-queries";

export function useActiveQuests() {
  return useQuery({
    queryKey: ["quests", "active"],
    queryFn: fetchActiveQuests,
    staleTime: 60_000,
  });
}
