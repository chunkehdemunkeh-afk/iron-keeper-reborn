import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchHyroxBenchmarks } from "@/lib/data/hyrox-benchmark-queries";

export function useHyroxBenchmarks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["hyrox-benchmarks", user?.id ?? ""],
    queryFn: fetchHyroxBenchmarks,
    enabled: !!user,
    staleTime: 60_000,
  });
}
