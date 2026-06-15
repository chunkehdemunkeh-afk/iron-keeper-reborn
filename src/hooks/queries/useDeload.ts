import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  acceptDeload,
  dismissDeload,
  fetchActiveDeload,
  type DeloadRecommendation,
} from "@/lib/data/deload-queries";
import { toast } from "sonner";
import { hapticSuccess, hapticMedium } from "@/lib/haptics";

const queryKey = (uid: string) => ["deload-active", uid] as const;

export function useActiveDeload() {
  const { user } = useAuth();
  return useQuery<DeloadRecommendation | null>({
    queryKey: queryKey(user?.id ?? ""),
    queryFn: fetchActiveDeload,
    enabled: !!user,
  });
}

export function useDeloadActions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => {
    if (!user) return;
    qc.invalidateQueries({ queryKey: queryKey(user.id) });
  };

  const accept = useMutation({
    mutationFn: (id: string) => acceptDeload(id),
    onSuccess: () => {
      hapticSuccess();
      toast.success("Deload week started — targets reduced for the next 7 days");
      invalidate();
    },
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => dismissDeload(id),
    onSuccess: () => {
      hapticMedium();
      toast("Deload dismissed");
      invalidate();
    },
  });

  return {
    accept: (id: string) => accept.mutate(id),
    dismiss: (id: string) => dismiss.mutate(id),
    isAccepting: accept.isPending,
  };
}
