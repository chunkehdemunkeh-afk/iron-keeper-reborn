import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import type { InboxThread } from "@/lib/data/coach-inbox-queries";
import AthleteAvatar from "@/components/coach/AthleteAvatar";
import { useAuth } from "@/hooks/useAuth";

export default function InboxList({ threads }: { threads: InboxThread[] }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="space-y-2">
      {threads.map((t) => (
        <button
          key={t.partnerId}
          onClick={() => navigate(`/inbox/${t.partnerId}`)}
          className="w-full flex items-center gap-3 rounded-2xl bg-card hairline border p-3 text-left hover:bg-muted/20 transition-colors"
        >
          <AthleteAvatar name={t.partnerName} url={t.partnerAvatar} size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold truncate">{t.partnerName}</p>
              {t.lastMessageAt && (
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatDistanceToNowStrict(new Date(t.lastMessageAt), { addSuffix: true })}
                </span>
              )}
            </div>
            <p
              className={`text-xs truncate mt-0.5 ${
                t.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {t.lastMessage
                ? `${t.lastSenderId === user?.id ? "You: " : ""}${t.lastMessage}`
                : "No messages yet — start the conversation"}
            </p>
          </div>
          {t.unread > 0 && (
            <span className="shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {t.unread}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
