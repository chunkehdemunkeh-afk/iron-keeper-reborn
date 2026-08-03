import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Dumbbell } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import {
  useThreadMessages,
  useSendMessage,
  useMarkThreadRead,
  useSessionSummaries,
} from "@/hooks/queries/useInbox";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { hapticLight } from "@/lib/haptics";

interface Props {
  coachUserId: string;
  athleteUserId: string;
  /** Optional session pre-attached to the next message (from "Comment" on a feed card). */
  attachedSessionId?: string | null;
  onClearAttachment?: () => void;
}

function dayLabel(d: Date) {
  const now = new Date();
  if (isSameDay(d, now)) return "Today";
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (isSameDay(d, y)) return "Yesterday";
  return format(d, "EEE d MMM");
}

export default function ConversationView({
  coachUserId,
  athleteUserId,
  attachedSessionId,
  onClearAttachment,
}: Props) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useThreadMessages(coachUserId, athleteUserId);
  const send = useSendMessage(coachUserId, athleteUserId);
  useMarkThreadRead(coachUserId, athleteUserId);

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sessionIds = useMemo(
    () => (messages ?? []).map((m) => m.sessionId).filter((v): v is string => !!v),
    [messages],
  );
  const allSessionIds = useMemo(
    () => (attachedSessionId ? [...sessionIds, attachedSessionId] : sessionIds),
    [sessionIds, attachedSessionId],
  );
  const { data: sessions } = useSessionSummaries(allSessionIds);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [coachUserId, athleteUserId]);

  async function handleSend() {
    const body = input.trim();
    if (!body || send.isPending) return;
    hapticLight();
    try {
      await send.mutateAsync({ body, sessionId: attachedSessionId ?? null });
      setInput("");
      onClearAttachment?.();
      inputRef.current?.focus();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const attached = attachedSessionId ? sessions?.[attachedSessionId] : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <LoadingState label="Loading messages" />
        ) : (messages ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No messages yet — say hello.
          </p>
        ) : (
          (messages ?? []).map((m, i, arr) => {
            const mine = m.senderId === user?.id;
            const d = new Date(m.createdAt);
            const prev = i > 0 ? new Date(arr[i - 1].createdAt) : null;
            const showDay = !prev || !isSameDay(prev, d);
            const session = m.sessionId ? sessions?.[m.sessionId] : null;

            return (
              <div key={m.id}>
                {showDay && (
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center my-3">
                    {dayLabel(d)}
                  </p>
                )}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[82%] space-y-1">
                    {session && (
                      <div
                        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] hairline border ${
                          mine ? "bg-primary/10 border-primary/30" : "bg-muted/40"
                        }`}
                      >
                        <Dumbbell className="h-3 w-3 text-primary shrink-0" />
                        <span className="font-semibold truncate">{session.name}</span>
                        <span className="text-muted-foreground shrink-0">
                          {format(new Date(session.date), "d MMM")}
                        </span>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted/60 text-foreground rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          mine ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {format(d, "HH:mm")}
                        {mine && m.read ? " · Seen" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className="shrink-0 hairline border-t bg-card/80 backdrop-blur-xl px-3 py-3 space-y-2"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {attached && (
          <div className="flex items-center gap-2 rounded-xl bg-primary/10 hairline border border-primary/30 px-3 py-2">
            <Dumbbell className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="flex-1 min-w-0 truncate text-xs font-semibold">
              Replying about {attached.name}
            </span>
            <button
              onClick={onClearAttachment}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Remove
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Write a message…"
            className="flex-1 min-w-0 resize-none rounded-2xl bg-muted/40 hairline border px-3.5 py-2.5 text-sm max-h-32 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={() => void handleSend()}
            disabled={send.isPending || !input.trim()}
            className="shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
