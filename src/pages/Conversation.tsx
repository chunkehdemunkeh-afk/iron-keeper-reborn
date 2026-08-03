import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useThreadContext } from "@/hooks/queries/useInbox";
import ConversationView from "@/components/coach/ConversationView";
import AthleteAvatar from "@/components/coach/AthleteAvatar";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { AsyncBoundary } from "@/components/ui/async-boundary";

export default function Conversation() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: ctx, isLoading } = useThreadContext(partnerId);
  const [attached, setAttached] = useState<string | null>(params.get("session"));

  const clearAttachment = () => {
    setAttached(null);
    if (params.get("session")) {
      params.delete("session");
      setParams(params, { replace: true });
    }
  };

  return (
    <AsyncBoundary>
      <div className="flex flex-col h-[100dvh] bg-background">
        <div
          className="shrink-0 bg-background/85 backdrop-blur-xl hairline border-b px-4 py-3 flex items-center gap-3"
          style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
        >
          <button
            onClick={() => navigate("/inbox")}
            className="h-9 w-9 rounded-xl bg-card flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Back to inbox"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {ctx && (
            <>
              <AthleteAvatar name={ctx.partnerName} url={ctx.partnerAvatar} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{ctx.partnerName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {ctx.iAmCoach ? "Your athlete" : "Your coach"}
                </p>
              </div>
              {ctx.iAmCoach && (
                <button
                  onClick={() => navigate(`/coach/athlete/${ctx.partnerId}`)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-muted/40 px-2.5 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Profile
                </button>
              )}
            </>
          )}
        </div>

        {isLoading ? (
          <LoadingState label="Loading conversation" />
        ) : !ctx ? (
          <EmptyState
            title="Conversation unavailable"
            description="You're not linked with this person any more."
          />
        ) : (
          <ConversationView
            coachUserId={ctx.coachUserId}
            athleteUserId={ctx.athleteUserId}
            attachedSessionId={attached}
            onClearAttachment={clearAttachment}
          />
        )}
      </div>
    </AsyncBoundary>
  );
}
