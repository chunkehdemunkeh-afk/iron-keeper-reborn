import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchInboxThreads,
  fetchUnreadMessageCount,
  fetchThreadMessages,
  fetchSessionSummaries,
  resolveThreadContext,
  sendMessage,
  markThreadRead,
} from "@/lib/data/coach-inbox-queries";

/** Live-refresh inbox data when any coach message row changes. */
function useMessagesRealtime() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("coach-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "coach_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["inbox"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, user]);
}

export function useInboxThreads() {
  const { user } = useAuth();
  useMessagesRealtime();
  return useQuery({
    queryKey: queryKeys.inboxThreads(user?.id ?? ""),
    queryFn: fetchInboxThreads,
    enabled: !!user,
    staleTime: 15_000,
  });
}

export function useUnreadMessages() {
  const { user } = useAuth();
  useMessagesRealtime();
  return useQuery({
    queryKey: queryKeys.inboxUnread(user?.id ?? ""),
    queryFn: fetchUnreadMessageCount,
    enabled: !!user,
    staleTime: 15_000,
  });
}

export function useThreadContext(partnerId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.inboxThreadContext(user?.id ?? "", partnerId ?? ""),
    queryFn: () => resolveThreadContext(partnerId!),
    enabled: !!user && !!partnerId,
  });
}

export function useThreadMessages(coachUserId?: string, athleteUserId?: string) {
  useMessagesRealtime();
  return useQuery({
    queryKey: queryKeys.inboxMessages(coachUserId ?? "", athleteUserId ?? ""),
    queryFn: () => fetchThreadMessages(coachUserId!, athleteUserId!),
    enabled: !!coachUserId && !!athleteUserId,
    staleTime: 5_000,
  });
}

export function useSessionSummaries(ids: string[]) {
  const key = [...new Set(ids)].sort().join(",");
  return useQuery({
    queryKey: ["inbox", "session-summaries", key],
    queryFn: () => fetchSessionSummaries(key ? key.split(",") : []),
    enabled: !!key,
    staleTime: 5 * 60_000,
  });
}

export function useSendMessage(coachUserId?: string, athleteUserId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, sessionId }: { body: string; sessionId?: string | null }) => {
      const { error } = await sendMessage(coachUserId!, athleteUserId!, body, sessionId);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useMarkThreadRead(coachUserId?: string, athleteUserId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!coachUserId || !athleteUserId) return;
    void markThreadRead(coachUserId, athleteUserId).then(() => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
    });
  }, [coachUserId, athleteUserId, qc]);
}
