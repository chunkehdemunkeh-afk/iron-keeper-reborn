import { useMemo, useState } from "react";
import { Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { MUSCLE_REGIONS, MUSCLE_LABELS, type MuscleRegion } from "@/lib/muscle-mapping";
import {
  VOLUME_STANDARDS,
  STRENGTH_STANDARDS,
  VOLUME_STATUS_COLOR,
  VOLUME_STATUS_LABEL,
  STATUS_SORT_ORDER,
  getVolumeStatus,
  getVolumeFeedback,
  type VolumeStatus,
} from "@/lib/volume-standards";
import { formatWeekRange } from "@/lib/weekly-review";
import { useWeeklyMuscleVolume } from "@/hooks/queries/useVolumeData";
import VolumeBodyDiagram from "./VolumeBodyDiagram";
import MuscleVolumeRow from "./MuscleVolumeRow";

const WEEK_LABELS = ["3w ago", "2w ago", "Last week", "This week"];

export default function VolumeTab() {
  const { data: weeklyData = [], isLoading } = useWeeklyMuscleVolume(4);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(3);
  const [goal, setGoal] = useState<"hypertrophy" | "strength">("hypertrophy");
  const [view, setView] = useState<"front" | "back">("front");
  const [highlighted, setHighlighted] = useState<MuscleRegion | null>(null);
  const [sheetMuscle, setSheetMuscle] = useState<MuscleRegion | null>(null);
  const [untrainedExpanded, setUntrainedExpanded] = useState(false);

  const safeIdx = Math.min(selectedWeekIdx, Math.max(weeklyData.length - 1, 0));
  const selectedWeek = weeklyData[safeIdx];

  const activeStandards = goal === "strength" ? STRENGTH_STANDARDS : VOLUME_STANDARDS;

  const statuses = useMemo<Record<MuscleRegion, VolumeStatus>>(() => {
    const out = {} as Record<MuscleRegion, VolumeStatus>;
    for (const m of MUSCLE_REGIONS) {
      const muscleData = selectedWeek?.muscles[m];
      const count = goal === "strength" && (muscleData?.rirLoggedSets ?? 0) > 0
        ? (muscleData?.strengthSets ?? 0)
        : (muscleData?.sets ?? 0);
      out[m] = getVolumeStatus(m, count, activeStandards[m]);
    }
    return out;
  }, [selectedWeek, goal, activeStandards]);

  const sorted = useMemo(() => {
    return [...MUSCLE_REGIONS].sort((a, b) => {
      const diff = STATUS_SORT_ORDER[statuses[a]] - STATUS_SORT_ORDER[statuses[b]];
      if (diff !== 0) return diff;
      return MUSCLE_LABELS[a].localeCompare(MUSCLE_LABELS[b]);
    });
  }, [statuses]);

  const sparklines = useMemo(() => {
    const out = {} as Record<MuscleRegion, number[]>;
    for (const m of MUSCLE_REGIONS) {
      out[m] = weeklyData.map(w => w.muscles[m]?.sets ?? 0);
      // Pad to 4 if we have fewer weeks
      while (out[m].length < 4) out[m].unshift(0);
    }
    return out;
  }, [weeklyData]);

  const optimalCount = MUSCLE_REGIONS.filter(m => statuses[m] === "optimal").length;
  const underCount = MUSCLE_REGIONS.filter(m => statuses[m] === "under_mev" || statuses[m] === "minimum").length;
  const overCount = MUSCLE_REGIONS.filter(m => statuses[m] === "over_mrv" || statuses[m] === "approaching_mrv").length;

  const trainedMuscles = sorted.filter(m => statuses[m] !== "untrained");
  const untrainedMuscles = sorted.filter(m => statuses[m] === "untrained");

  const sheetMuscleStatus = sheetMuscle ? statuses[sheetMuscle] : null;
  const sheetMuscleStd = sheetMuscle ? activeStandards[sheetMuscle] : null;

  if (isLoading) return <LoadingState label="Calculating muscle volume" />;
  if (!weeklyData.length) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="No logged sets yet"
        description="Complete a workout to see your weekly muscle volume."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Week selector */}
      <div className="glass-card rounded-xl p-3 space-y-2">
        <div className="flex gap-1.5">
          {WEEK_LABELS.map((label, i) => {
            const available = i < weeklyData.length;
            const isSelected = i === safeIdx;
            return (
              <button
                key={label}
                type="button"
                disabled={!available}
                onClick={() => setSelectedWeekIdx(i)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : available
                    ? "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                    : "bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {selectedWeek && (
          <p className="text-[11px] text-muted-foreground text-center">
            {formatWeekRange(selectedWeek.weekStart)}
          </p>
        )}
      </div>

      {/* Goal toggle */}
      <div className="flex rounded-xl overflow-hidden border border-border/50 bg-muted/20">
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

      {/* Body diagram */}
      <div className="glass-card rounded-xl p-3">
        <div className="flex justify-center gap-2 mb-3">
          {(["front", "back"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors capitalize ${
                view === v
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <VolumeBodyDiagram
          statuses={statuses}
          view={view}
          highlighted={highlighted}
          onMuscleClick={(m) => {
            setHighlighted(prev => prev === m ? null : m);
            setSheetMuscle(m);
          }}
        />

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3">
          {(["under_mev", "minimum", "optimal", "approaching_mrv", "over_mrv"] as VolumeStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: VOLUME_STATUS_COLOR[s] }} />
              <span className="text-[10px] text-muted-foreground">{VOLUME_STATUS_LABEL[s]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: VOLUME_STATUS_COLOR.optimal }} />
          <span className="text-xs font-semibold">{optimalCount}</span>
          <span className="text-xs text-muted-foreground">Optimal</span>
        </div>
        <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: VOLUME_STATUS_COLOR.under_mev }} />
          <span className="text-xs font-semibold">{underCount}</span>
          <span className="text-xs text-muted-foreground">Under target</span>
        </div>
        <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: VOLUME_STATUS_COLOR.approaching_mrv }} />
          <span className="text-xs font-semibold">{overCount}</span>
          <span className="text-xs text-muted-foreground">Near/Over MRV</span>
        </div>
      </div>

      {/* Muscle list */}
      <div className="glass-card rounded-xl overflow-hidden">
        {trainedMuscles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 px-4">
            No working sets logged this week.
          </p>
        ) : (
          <div className="divide-y divide-border/30">
            {trainedMuscles.map((m) => (
              <MuscleVolumeRow
                key={m}
                muscle={m}
                sets={selectedWeek?.muscles[m]?.sets ?? 0}
                load={selectedWeek?.muscles[m]?.load ?? 0}
                strengthSets={selectedWeek?.muscles[m]?.strengthSets ?? 0}
                status={statuses[m]}
                standard={activeStandards[m]}
                weeklySetCounts={sparklines[m]}
                goal={goal}
                isHighlighted={highlighted === m}
                onClick={() => {
                  setHighlighted(prev => prev === m ? null : m);
                  setSheetMuscle(m);
                }}
              />
            ))}
          </div>
        )}

        {/* Untrained section */}
        {untrainedMuscles.length > 0 && (
          <div className="border-t border-border/30">
            <button
              type="button"
              onClick={() => setUntrainedExpanded(e => !e)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{untrainedMuscles.length} untrained this week</span>
              {untrainedExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {untrainedExpanded && (
              <div className="divide-y divide-border/20">
                {untrainedMuscles.map((m) => (
                  <MuscleVolumeRow
                    key={m}
                    muscle={m}
                    sets={0}
                    load={0}
                    strengthSets={0}
                    status="untrained"
                    standard={activeStandards[m]}
                    weeklySetCounts={sparklines[m]}
                    goal={goal}
                    isHighlighted={highlighted === m}
                    onClick={() => {
                      setHighlighted(prev => prev === m ? null : m);
                      setSheetMuscle(m);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!sheetMuscle} onOpenChange={(o) => { if (!o) { setSheetMuscle(null); setHighlighted(null); } }}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
          {sheetMuscle && sheetMuscleStatus && sheetMuscleStd && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  {MUSCLE_LABELS[sheetMuscle]}
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: `${VOLUME_STATUS_COLOR[sheetMuscleStatus]}22`,
                      color: VOLUME_STATUS_COLOR[sheetMuscleStatus],
                    }}
                  >
                    {VOLUME_STATUS_LABEL[sheetMuscleStatus]}
                  </span>
                </SheetTitle>
              </SheetHeader>

              {/* Standards grid */}
              <div className="grid grid-cols-3 gap-2 mb-1">
                {[
                  { label: "MEV", value: sheetMuscleStd.mev, desc: "min effective" },
                  { label: "MAV", value: `${sheetMuscleStd.mavLow}–${sheetMuscleStd.mavHigh}`, desc: "optimal range" },
                  { label: "MRV", value: sheetMuscleStd.mrv, desc: "max recoverable" },
                ].map(({ label, value, desc }) => (
                  <div key={label} className="glass-card rounded-xl p-2.5 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
                    <div className="text-lg font-bold font-display">{value}</div>
                    <div className="text-[10px] text-muted-foreground">{desc}</div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/70 text-center mb-4 px-1">
                Sets per week below MEV don't drive growth · MAV is your sweet spot · above MRV recovery suffers
              </p>

              {/* This week */}
              {(() => {
                const md = selectedWeek?.muscles[sheetMuscle];
                const useStrSets = goal === "strength" && (md?.rirLoggedSets ?? 0) > 0;
                const displayCount = useStrSets ? (md?.strengthSets ?? 0) : (md?.sets ?? 0);
                return (
                  <div className="glass-card rounded-xl p-3 mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">This week</div>
                      <div className="text-2xl font-bold font-display" style={{ color: VOLUME_STATUS_COLOR[sheetMuscleStatus] }}>
                        {displayCount}
                        <span className="text-sm font-normal text-muted-foreground ml-1">sets</span>
                      </div>
                      {useStrSets && (md?.sets ?? 0) !== displayCount && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {Math.round(md?.sets ?? 0)} total · {displayCount} heavy (RIR ≤ 1)
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Volume</div>
                      <div className="text-sm font-semibold">
                        {Math.round(md?.load ?? 0).toLocaleString()} kg
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Feedback */}
              <div className="glass-card rounded-xl p-3 mb-4">
                <p className="text-sm text-foreground leading-relaxed">
                  {(() => {
                    const md = selectedWeek?.muscles[sheetMuscle];
                    const useStrSets = goal === "strength" && (md?.rirLoggedSets ?? 0) > 0;
                    return getVolumeFeedback(sheetMuscle, sheetMuscleStatus, useStrSets ? (md?.strengthSets ?? 0) : (md?.sets ?? 0), goal);
                  })()}
                </p>
              </div>

              {/* 4-week sparkline */}
              <div className="glass-card rounded-xl p-3">
                <div className="text-xs text-muted-foreground mb-2">4-week trend (sets)</div>
                <div className="flex items-end justify-around h-16 gap-2">
                  {sparklines[sheetMuscle].map((count, i) => {
                    const max = Math.max(...sparklines[sheetMuscle], sheetMuscleStd.mrv, 1);
                    const isNow = i === sparklines[sheetMuscle].length - 1;
                    const status = getVolumeStatus(sheetMuscle, count, sheetMuscleStd);
                    const color = VOLUME_STATUS_COLOR[status];
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
                        <div
                          className="w-full rounded-sm"
                          style={{
                            height: `${Math.max(Math.round((count / max) * 100), 4)}%`,
                            background: isNow ? color : "hsl(220 14% 35%)",
                            opacity: isNow ? 1 : 0.6,
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {["3w", "2w", "1w", "Now"][i]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
