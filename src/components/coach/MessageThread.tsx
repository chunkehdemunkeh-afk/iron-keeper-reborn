import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { fetchThread, sendCoachMessage, markThreadRead, type CoachMessage } from "@/lib/data/coach-queries";
import { toast } from "sonner";

interface MessageThreadProps {
  coachUserId: string;
  athleteUserId: string;
  currentUserId: string;
}

export default function MessageThread({ coachUserId, athleteUserId, currentUserId }: MessageThreadProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, [coachUserId, athleteUserId]);

  async function load() {
    setLoading(true);
    const thread = await fetchThread(coachUserId, athleteUserId);
    setMessages(thread);
    setLoading(false);
    markThreadRead(coachUserId, athleteUserId);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function handleSend() {
    const body = input.trim();
    if (!body) return;
    setSending(true);
    const { error } = await sendCoachMessage(coachUserId, athleteUserId, body);
    setSending(false);
    if (error) {
      toast.error(error);
      return;
    }
    setInput("");
    load();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 px-1 py-2 min-h-[200px] max-h-[350px]">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-4">No messages yet — say hello.</p>
        ) : (
          messages.map((m) => {
            const isMine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                    isMine ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[9px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 pt-2 border-t border-border/30">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Write a message…"
          className="flex-1 min-w-0 rounded-lg bg-muted/40 border border-border/40 px-3 py-2 text-sm"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
