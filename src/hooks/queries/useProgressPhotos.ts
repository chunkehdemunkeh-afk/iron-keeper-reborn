import { useQuery } from "@tanstack/react-query";
import { fetchProgressPhotos } from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";

export function useProgressPhotos() {
  return useQuery({
    queryKey: queryKeys.progressPhotos(),
    queryFn: fetchProgressPhotos,
  });
}
