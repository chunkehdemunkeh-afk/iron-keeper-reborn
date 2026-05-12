import { useState, useEffect, useCallback, useMemo } from "react";
import { getStretchesForWorkout, getTotalStretchTime } from "@/lib/stretching-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Play, ExternalLink, Timer, Check, StretchHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserPreferences, getNextSplitDay, isGKSplit } from "@/lib/user-preferences";
import { useWorkoutHistory } from "@/hooks/queries/useWorkoutHistory";
import { toast } from "sonner";
import { hapticSuccess } from "@/lib/haptics";

export default function DailyStretchCard() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [videoStretch, setVideoStretch] = useState<{ name: string; url: string } | null>(null);
  const [completedToday, setCompletedToday] = useState(false);
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  // Same query key as NextSessionCard — React Query deduplicates the fetch
  const prefs = user ? getUserPreferences(user.id) : null;
  const gkMode = user ? isGKSplit(user.id) : false;
  const isDailyStretchUser = user?.id === "7dac1761-76f7-4b4a-a4f0-e88297247037";
  const { data: history = [] } = useWorkoutHistory();

  // Special daily routine for specific users or GK users; others get workout-specific stretches
  const nextWorkoutId = useMemo(() => {
    if (gkMode || isDailyStretchUser) return "daily_gk";
    if (!prefs?.schedule?.length) return "fullbody";
    const recent = history.map((h) => h.workoutId);
    return getNextSplitDay(prefs.schedule, recent).next.workoutId;
  }, [prefs, history, gkMode, isDailyStretchUser]);

  const stretches = useMemo(() => getStretchesForWorkout(nextWorkoutId), [nextWorkoutId]);

  // Check if stretches completed today
  useEffect(() => {
    if (!user) return;
    supabase
      .from("stretch_completions")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", todayStr)
      .maybeSingle()
      .then(({ data }) => setCompletedToday(!!data));
  }, [user, todayStr]);

  const markComplete = useCallback(async () => {
    if (!user || completedToday || loading) return;
    setLoading(true);
    const { error } = await supabase
      .from("stretch_completions")
      .insert({ user_id: user.id, date: todayStr });
    setLoading(false);
    if (!error) {
      setCompletedToday(true);
      hapticSuccess();
      toast.success("Stretches done! 🧘", {
        description: "Your body will thank you for it.",
      });
    }
  }, [user, completedToday, loading, todayStr]);

  const embedUrl = (() => {
    if (!videoStretch) return null;
    const isShort = videoStretch.url.includes("/shorts/");
    const shortId = isShort ? videoStretch.url.split("/shorts/")[1]?.split("?")[0] : null;
    return shortId ? `https://www.youtube.com/embed/${shortId}?autoplay=1&loop=1&rel=0` : null;
  })();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${completedToday ? "bg-success/20" : "bg-success/15"}`}>
              {completedToday ? (
                <Check className="h-5 w-5 text-success" />
              ) : (
                <StretchHorizontal className="h-5 w-5 text-success" />
              )}
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                {(gkMode || isDailyStretchUser) ? "Daily Stretches" : "Pre-Workout Stretches"}
                {completedToday && (
                  <span className="ml-2 text-xs font-medium text-success">Done ✓</span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                {stretches.length} stretches · {getTotalStretchTime(stretches)}
              </p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2">
                {stretches.map((stretch, i) => (
                  <motion.div
                    key={stretch.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {stretch.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {stretch.holdTime}
                        </span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-[11px] text-muted-foreground">
                          {stretch.sets} sets
                        </span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-[11px] text-muted-foreground">
                          {stretch.targetArea}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-1">
                        {stretch.notes}
                      </p>
                    </div>
                    <button
                      onClick={() => setVideoStretch({ name: stretch.name, url: stretch.videoUrl })}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </motion.div>
                ))}

                {!completedToday ? (
                  <button
                    onClick={markComplete}
                    disabled={loading}
                    className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] glow-primary disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {loading ? "Saving..." : "Mark Stretches Complete"}
                  </button>
                ) : (
                  <div className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-success/15 px-5 py-3 text-sm font-semibold text-success">
                    <Check className="h-4 w-4" />
                    Completed Today
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Video sheet */}
      <Sheet open={!!videoStretch} onOpenChange={(open) => !open && setVideoStretch(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl bg-card border-border/50 p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="font-display text-lg text-foreground flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" />
              How to: {videoStretch?.name}
              {videoStretch && (
                <a
                  href={videoStretch.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4 h-full">
            {videoStretch && embedUrl && (
              <iframe
                src={embedUrl}
                className="w-full rounded-xl"
                style={{ height: "calc(100% - 60px)" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`${videoStretch.name} tutorial`}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
