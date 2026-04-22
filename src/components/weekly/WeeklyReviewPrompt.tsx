import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchWeeklyReview,
  type WeeklyReview,
} from "@/lib/cloud-data";
import {
  getCurrentWeekStart,
  shouldShowSundayPrompt,
  dismissPromptForCurrentWeek,
} from "@/lib/weekly-review";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import WeeklyReviewSheet from "./WeeklyReviewSheet";

export default function WeeklyReviewPrompt() {
  const { user } = useAuth();
  const weekStart = getCurrentWeekStart();
  const [show, setShow] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: review } = useQuery<WeeklyReview | null>({
    queryKey: ["weekly-review", weekStart],
    queryFn: () => fetchWeeklyReview(weekStart),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      if (shouldShowSundayPrompt(user.id, !!review)) setShow(true);
    }, 1500);
    return () => clearTimeout(t);
  }, [user, review]);

  function dismiss() {
    if (user) dismissPromptForCurrentWeek(user.id);
    setShow(false);
  }

  function open() {
    setSheetOpen(true);
    setShow(false);
  }

  if (!user) return null;

  return (
    <>
      <AnimatePresence>
        {show && !sheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={dismiss}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl p-5 w-full max-w-sm shadow-2xl relative"
            >
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted/50 text-muted-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 mb-3">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                It's Sunday — how was your week?
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Take 2 minutes to reflect on the past 7 days. We've already crunched the numbers for you.
              </p>
              <div className="flex flex-col gap-2 mt-4">
                <button
                  onClick={open}
                  className="rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold"
                >
                  Start review
                </button>
                <button
                  onClick={dismiss}
                  className="rounded-xl bg-muted/50 text-muted-foreground py-2.5 text-sm font-medium"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <WeeklyReviewSheet
        open={sheetOpen}
        weekStart={weekStart}
        mode={review ? "edit" : "create"}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
