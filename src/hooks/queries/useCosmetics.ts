import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchCosmetics, fetchOwnedCosmetics, fetchEquipped } from "@/lib/data/cosmetics-queries";

export function useCosmetics() {
  return useQuery({ queryKey: ["cosmetics"], queryFn: fetchCosmetics, staleTime: 60_000 });
}

export function useOwnedCosmetics() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["owned-cosmetics", user?.id ?? ""],
    queryFn: () => fetchOwnedCosmetics(user!.id),
    enabled: !!user?.id,
  });
}

export function useEquippedCosmetics(userId?: string) {
  const { user } = useAuth();
  const id = userId ?? user?.id;
  return useQuery({
    queryKey: ["equipped-cosmetics", id ?? ""],
    queryFn: () => fetchEquipped(id!),
    enabled: !!id,
  });
}
