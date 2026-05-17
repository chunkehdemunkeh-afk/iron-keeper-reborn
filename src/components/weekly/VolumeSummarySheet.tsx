import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MUSCLE_REGIONS, MUSCLE_LABELS, type MuscleRegion } from "@/lib/muscle-mapping";
import {
  VOLUME_STANDARDS,
  VOLUME_STATUS_COLOR,
  VOLUME_STATUS_LABEL,
  STATUS_SORT_ORDER,
  getVolumeStatus,
  getVolumeFeedback,
  type VolumeStatus,
} from "@/lib/volume-standards";
import { formatWeekRange } from "@/lib/weekly-review";
import type { WeeklyMuscleData } from "@/lib/data/volume-queries";

interface Props {
  open: boolean;
  weekData: WeeklyMuscleData | null;
  onClose: () => void;
  onDismiss: () => void;
}

const STATUS_CHIP_ICONS: Record<VolumeStatus, string> = {
  untrained: "—",
  under_mev: "⚠️",
  minimum: "📈",
  optimal: "✅",
  approaching_mrv: "🟠",
  over_mrv: "🔴",
};

export default function VolumeSummarySheet({ open, weekData, onClose, onDismiss }: Props) {
  const navigate = useNavigate();
  const [goal, setGoal] = useState<"hypertrophy" | "strength">("hypertrophy");
  const [untrainedExpanded, setUntrainedExpanded] = useState(false);

  const statuses = useMemo<Record<MuscleRegion, VolumeStatus>>(() => {
    const out = {} as Record<MuscleRegion, VolumeStatus>;
    for (const m of MUSCLE_REGIONS) {
      out[m] = getVolumeStatus(m, weekData?.muscles[m]?.sets ?? 0);
    }
    return out;
  }, [weekData]);

  const sorted = useMemo(() => {
    return [...MUSCLE_REGIONS].sort((a, b) => {
      const diff = STATUS_SORT_ORDER[statuses[a]] - STATUS_SORT_ORDER[statuses[b]];
      if (diff !== 0) return diff;
      return MUSCLE_LABELS[a].localeCompare(MUSCLE_LABELS[b]);
    });
  }, [statuses]);

  const trainedMuscles = sorted.filter(m => statuses[m] !== "untrained");
  const untrainedMuscles = sorted.filter(m => statuses[m] === "untrained");

  const optimalCount = MUSCLE_REGIONS.filter(m => statuses[m] === "optimal").length;
  const underCount = MUSCLE_REGIONS.filter(m => statuses[m] === "under_mev" || statuses[m] === "minimum").length;
  const overCount = MUSCLE_REGIONS.filter(m => statuses[m] === "over_mrv" || statuses[m] === "approaching_mrv").length;

  // Top 3 recommendations: over_mrv first, then under_mev
  const recommendations = useMemo(() => {
    const priority = ["over_mrv", "under_mev", "approaching_mrv", "minimum"] as VolumeStatus[];
    const rec: { muscle: MuscleRegion; text: string }[] = [];
    for (const status of priority) {
      for (const m of sorted) {
        if (statuses[m] === status && rec.length < 3) {
          rec.push({
            muscle: m,
            text: getVolumeFeedback(m, status, weekData?.muscles[m]?.sets ?? 0, goal),
          });
        }
      }
      if (rec.length >= 3) break;
    }
    return rec;
  }, [sorted, statuses, weekData, goal]);

  function handleViewFull() {
    navigate("/progress?tab=volume");
    onClose();
  }

  function handleDone() {
    onDismiss();
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-3">
          <SheetTitle className="text-lg">
            {weekData ? formatWeekRange(weekData.weekStart) : "Weekly Volume"}
          </SheetTitle>
        </SheetHeader>

        {/* Goal toggle */}
        <div className="flex rounded-xl overflow-hidden border border-border/50 bg-muted/20 mb-4">
          {(["hypertrophy", "strength"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoal(g)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors capitalize ${
                goal === g
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Status chips */}
        <div className="flex gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-1.5 glass-card rounded-lg px-3 py-1.5">
            <span className="text-sm">✅</span>
            <span className="text-xs font-semibold">{optimalCount}</span>
            <span className="text-xs text-muted-foreground">Optimal</span>
          </div>
          <div className="flex items-center gap-1.5 glass-card rounded-lg px-3 py-1.5">
            <span className="text-sm">⚠️</span>
            <span className="text-xs font-semibold">{underCount}</span>
            <span className="text-xs text-muted-foreground">Under target</span>
          </div>
          <div className="flex items-center gap-1.5 glass-card rounded-lg px-3 py-1.5">
            <span className="text-sm">🔴</span>
            <span className="text-xs font-semibold">{overCount}</span>
            <span className="text-xs text-muted-foreground">Near/Over MRV</span>
          </div>
        </div>

        {/* Muscle list */}
        {trainedMuscles.length > 0 && (
          <div className="glass-card rounded-xl overflow-hidden mb-3">
            <div className="divide-y divide-border/30">
              {trainedMuscles.map((m) => {
                const sets = weekData?.muscles[m]?.sets ?? 0;
                const status = statuses[m];
                const std = VOLUME_STANDARDS[m];
                const color = VOLUME_STATUS_COLOR[status];
                const cap = std.mrv;
                const fillPct = Math.min(Math.round((sets / cap) * 100), 100);

                return (
                  <div key={m} className="px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{STATUS_CHIP_ICONS[status]}</span>
                        <span className="text-sm font-semibold">{MUSCLE_LABELS[m]}</span>
                      </div>
                      <span className="text-xs tabular-nums" style={{ color }}>
                        {sets} sets
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${fillPct}%`, background: color }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{VOLUME_STATUS_LABEL[status]}</span>
                      <span className="text-[10px] text-muted-foreground">target {std.mavLow}–{std.mavHigh}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Untrained section */}
            {untrainedMuscles.length > 0 && (
              <div className="border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setUntrainedExpanded(e => !e)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground"
                >
                  <span>{untrainedMuscles.length} untrained this week</span>
                  {untrainedExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {untrainedExpanded && (
                  <div className="px-3 pb-2">
                    <div className="flex flex-wrap gap-1.5">
                      {untrainedMuscles.map(m => (
                        <span key={m} className="text-[11px] bg-muted/30 rounded-full px-2 py-0.5 text-muted-foreground">
                          {MUSCLE_LABELS[m]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="glass-card rounded-xl p-3 mb-4 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Next week recommendations
            </div>
            {recommendations.map(({ muscle, text }, i) => (
              <div key={i} className="text-sm text-foreground leading-relaxed">
                {text}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleViewFull}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold"
          >
            View full breakdown
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="px-5 bg-muted/40 text-muted-foreground rounded-xl py-3 text-sm font-semibold hover:bg-muted/60 transition-colors"
          >
            Done
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
