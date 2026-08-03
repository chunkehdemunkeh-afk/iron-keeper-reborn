import { useNavigate } from "react-router-dom";
import { ArrowLeft, Inbox as InboxIcon } from "lucide-react";
import { useInboxThreads } from "@/hooks/queries/useInbox";
import InboxList from "@/components/coach/InboxList";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { AsyncBoundary } from "@/components/ui/async-boundary";

export default function Inbox() {
  const navigate = useNavigate();
  const { data: threads, isLoading } = useInboxThreads();

  return (
    <AsyncBoundary>
      <div className="min-h-screen bg-background safe-bottom">
        <div
          className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl hairline border-b px-4 py-4 flex items-center gap-3"
          style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))" }}
        >
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-xl bg-card flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">Inbox</h1>
            <p className="text-xs text-muted-foreground">
              {threads?.length ?? 0} conversation{(threads?.length ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-lg md:max-w-2xl px-4 py-4 pb-24">
          {isLoading ? (
            <LoadingState label="Loading conversations" />
          ) : (threads ?? []).length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              title="No conversations yet"
              description="Join a coach with an invite code from your profile, or add athletes to your roster to start messaging."
            />
          ) : (
            <InboxList threads={threads!} />
          )}
        </div>
      </div>
    </AsyncBoundary>
  );
}
