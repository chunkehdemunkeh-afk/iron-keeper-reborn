import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllClans, fetchMyClan, fetchClanMembers } from "@/lib/data/clan-queries";

export function useAllClans() {
  return useQuery({ queryKey: ["clans-all"], queryFn: fetchAllClans, staleTime: 30_000 });
}

export function useMyClan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clan-mine", user?.id ?? ""],
    queryFn: () => fetchMyClan(user!.id),
    enabled: !!user?.id,
  });
}

export function useClanMembers(clanId?: string) {
  return useQuery({
    queryKey: ["clan-members", clanId ?? ""],
    queryFn: () => fetchClanMembers(clanId!),
    enabled: !!clanId,
  });
}
