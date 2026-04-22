import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchWeeklyReview, type WeeklyReview } from "@/lib/cloud-data";
import {
  getPreviousWeekStart,
  shouldShowMondayBanner,
  dismissPromptForPreviousWeek,
  formatWeekRange,
} from "@/lib/weekly-review";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, CalendarCheck } from "lucide-react";
import WeeklyReviewSheet from "./WeeklyReviewSheet";

export default function MondayBanner() {
  const { user } = useAuth();
  const weekStart = getPreviousWeekStart();
  const [hidden, setHidden] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: review } = useQuery<WeeklyReview | null>({
    queryKey: ["weekly-review", weekStart],
    queryFn: () => fetchWeeklyReview(weekStart),
    enabled: !!user,
  });

  if (!user) return null;
  const visible = !hidden && shouldShowMondayBanner(user.id, !!review);

  function dismiss() {
    if (user) dismissPromptForPreviousWeek(user.id);
    setHidden(true);
  }

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            type="button"
            onClick={() => setSheetOpen(true)}
            className="w-full glass-card rounded-xl p-3 flex items-center gap-3 text-left ring-1 ring-primary/20"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 flex-shrink-0">
              <CalendarCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Reflect on last week</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {formatWeekRange(weekStart)} · 2-min recap
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); dismiss(); }}
              className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>
      <WeeklyReviewSheet
        open={sheetOpen}
        weekStart={weekStart}
        mode="create"
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
