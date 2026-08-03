import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { joinCoachByCode } from "@/lib/data/coach-queries";
import { clearPendingCoachCode, normaliseInviteCode, setPendingCoachCode } from "@/lib/coach-invite";

/**
 * Public invite-link landing page: `/join/<CODE>`.
 * Signed-in athletes are linked to the coach immediately; everyone else has the
 * code stashed so onboarding can apply it right after sign-up.
 */
export default function JoinCoach() {
  const { code: rawCode } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"working" | "done">("working");
  const ran = useRef(false);

  useEffect(() => {
    if (loading || ran.current) return;
    ran.current = true;

    const code = normaliseInviteCode(rawCode ?? "");
    if (!code) {
      toast.error("That invite link isn't valid");
      navigate("/", { replace: true });
      return;
    }

    if (!user) {
      setPendingCoachCode(code);
      setStatus("done");
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      const { coachName, error } = await joinCoachByCode(code);
      if (error) {
        toast.error(error);
      } else {
        clearPendingCoachCode();
        toast.success(`You're now connected with ${coachName ?? "your coach"}`);
      }
      setStatus("done");
      navigate("/", { replace: true });
    })();
  }, [loading, user, rawCode, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
        <UserCheck className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm font-semibold text-foreground">Connecting you with your coach…</p>
      {status === "working" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
