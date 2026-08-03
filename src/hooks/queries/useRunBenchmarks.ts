import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchRunBenchmarks } from "@/lib/data/run-benchmark-queries";

export function useRunBenchmarks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["run-benchmarks", user?.id ?? ""],
    queryFn: fetchRunBenchmarks,
    enabled: !!user,
    staleTime: 60_000,
  });
}
