import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { joinCoachByCode } from "@/lib/data/coach-queries";
import { clearPendingCoachCode, parseInviteInput } from "@/lib/coach-invite";
import { hapticSuccess } from "@/lib/haptics";

/**
 * First onboarding step: optionally link the athlete to a coach with an invite
 * code or link, so the coach dashboard and inbox work from day one.
 */
export default function CoachLinkStep({
  initialCode,
  onDone,
}: {
  initialCode: string;
  onDone: (coachName: string | null) => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [joining, setJoining] = useState(false);

  const cleaned = parseInviteInput(code);
  const canJoin = cleaned.length >= 4 && !joining;

  const handleJoin = async () => {
    if (!canJoin) return;
    setJoining(true);
    const { coachName, error } = await joinCoachByCode(cleaned);
    setJoining(false);
    if (error) {
      toast.error(error === "Invalid invite code" ? "We couldn't find that code" : error);
      return;
    }
    clearPendingCoachCode();
    hapticSuccess();
    toast.success(`Connected with ${coachName ?? "your coach"}`);
    onDone(coachName);
  };

  const handleSkip = () => {
    clearPendingCoachCode();
    onDone(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background flex flex-col"
    >
      <div className="flex-1 px-4 pt-16">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <UserCheck className="h-6 w-6 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground mt-5">
          Training with a coach?
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Enter their invite code (or paste their invite link) and your sessions will appear on
          their dashboard. You'll be able to message each other straight away.
        </p>

        {initialCode && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2.5">
            <Check className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-foreground">
              We found an invite code from the link you opened.
            </p>
          </div>
        )}

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. 4KD9QP"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Coach invite code"
          className="mt-5 w-full rounded-2xl border border-border/50 bg-muted/30 px-4 py-4 text-center font-display text-2xl font-bold tracking-[0.3em] uppercase text-foreground outline-none placeholder:tracking-normal placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
        />
      </div>

      <div className="px-4 pb-10 pt-4 space-y-3">
        <button
          onClick={handleJoin}
          disabled={!canJoin}
          className={`w-full rounded-2xl py-4 text-base font-bold flex items-center justify-center gap-2 transition-all ${
            canJoin
              ? "gradient-primary text-primary-foreground glow-primary active:scale-[0.98]"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {joining && <Loader2 className="h-4 w-4 animate-spin" />}
          Connect with coach
        </button>
        <button
          onClick={handleSkip}
          className="w-full rounded-2xl border border-border/50 py-3.5 text-sm font-semibold text-muted-foreground active:scale-[0.98] transition-transform"
        >
          I don't have a coach
        </button>
      </div>
    </motion.div>
  );
}
