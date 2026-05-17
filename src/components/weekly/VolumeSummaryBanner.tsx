import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { MUSCLE_REGIONS } from "@/lib/muscle-mapping";
import { getVolumeStatus } from "@/lib/volume-standards";
import {
  getCurrentWeekStart,
  getPreviousWeekStart,
  shouldShowVolumePromptSunday,
  shouldShowVolumePromptMonday,
  dismissVolumePrompt,
} from "@/lib/weekly-review";
import { formatWeekRange } from "@/lib/weekly-review";
import { useWeeklyMuscleVolume } from "@/hooks/queries/useVolumeData";
import VolumeSummarySheet from "./VolumeSummarySheet";

export default function VolumeSummaryBanner() {
  const { user } = useAuth();
  const [hidden, setHidden] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const isSunday = useMemo(() => {
    const now = new Date();
    return now.getDay() === 0 && now.getHours() >= 18;
  }, []);

  const targetWeekStart = isSunday ? getCurrentWeekStart() : getPreviousWeekStart();

  const { data: weeklyData = [] } = useWeeklyMuscleVolume(2);

  const weekData = useMemo(() => {
    return weeklyData.find(w => w.weekStart === targetWeekStart) ?? null;
  }, [weeklyData, targetWeekStart]);

  if (!user) return null;

  const visible =
    !hidden &&
    (shouldShowVolumePromptSunday(user.id) || shouldShowVolumePromptMonday(user.id));

  if (!visible) return null;

  // Compute quick counts for the banner subtitle
  const underCount = MUSCLE_REGIONS.filter(m => {
    const sets = weekData?.muscles[m]?.sets ?? 0;
    const s = getVolumeStatus(m, sets);
    return s === "under_mev" || s === "minimum";
  }).length;

  const overCount = MUSCLE_REGIONS.filter(m => {
    const sets = weekData?.muscles[m]?.sets ?? 0;
    const s = getVolumeStatus(m, sets);
    return s === "over_mrv" || s === "approaching_mrv";
  }).length;

  const subtitle = [
    underCount > 0 ? `${underCount} under MEV` : "",
    overCount > 0 ? `${overCount} near MRV` : "",
  ].filter(Boolean).join(" · ") || `${formatWeekRange(targetWeekStart)}`;

  function dismiss() {
    if (user) dismissVolumePrompt(user.id, targetWeekStart);
    setHidden(true);
  }

  return (
    <>
      <AnimatePresence>
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          type="button"
          onClick={() => setSheetOpen(true)}
          className="w-full glass-card rounded-xl p-3 flex items-center gap-3 text-left ring-1 ring-primary/20"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 flex-shrink-0">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Weekly muscle volume ready</p>
            <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
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
      </AnimatePresence>

      <VolumeSummarySheet
        open={sheetOpen}
        weekData={weekData}
        onClose={() => setSheetOpen(false)}
        onDismiss={dismiss}
      />
    </>
  );
}
