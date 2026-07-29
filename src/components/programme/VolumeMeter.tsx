import { MUSCLE_LABELS, type MuscleRegion, MUSCLE_REGIONS } from "@/lib/muscle-mapping";
import { VOLUME_STANDARDS, STRENGTH_STANDARDS, getVolumeStatus, VOLUME_STATUS_COLOR, VOLUME_STATUS_LABEL, STATUS_SORT_ORDER } from "@/lib/volume-standards";
import type { MuscleVolumeMap, ProgrammeGoal } from "@/lib/programme-customizer";

type Props = {
  volume: MuscleVolumeMap;
  goal: ProgrammeGoal;
  /** Only show muscles the current schedule touches (non-zero) plus any below MEV that matter. */
  compact?: boolean;
};

export function VolumeMeter({ volume, goal, compact = false }: Props) {
  const standards = goal === "strength" ? STRENGTH_STANDARDS : VOLUME_STANDARDS;

  const rows = MUSCLE_REGIONS
    .map((m) => {
      const std = standards[m];
      const sets = volume[m] ?? 0;
      const status = getVolumeStatus(m, sets, std);
      return { muscle: m, sets, status, std };
    })
    .filter((r) => !compact || r.sets > 0 || r.status === "under_mev")
    .sort((a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]);

  return (
    <div className="space-y-2">
      {rows.map(({ muscle, sets, status, std }) => {
        const pct = Math.min(100, (sets / Math.max(std.mrv, 1)) * 100);
        const mevPct = (std.mev / std.mrv) * 100;
        const mavLowPct = (std.mavLow / std.mrv) * 100;
        const mavHighPct = (std.mavHigh / std.mrv) * 100;
        return (
          <div key={muscle} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">{MUSCLE_LABELS[muscle]}</span>
              <span className="text-muted-foreground tabular-nums">
                {sets} <span className="opacity-60">/ {std.mavLow}–{std.mavHigh}</span>
                <span
                  className="ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                  style={{ backgroundColor: `${VOLUME_STATUS_COLOR[status]}30`, color: VOLUME_STATUS_COLOR[status] }}
                >
                  {VOLUME_STATUS_LABEL[status]}
                </span>
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted/40 overflow-hidden">
              {/* MEV/MAV/MRV band markers */}
              <div className="absolute inset-y-0 left-0 bg-muted/30" style={{ width: `${mevPct}%` }} />
              <div className="absolute inset-y-0 bg-primary/10" style={{ left: `${mavLowPct}%`, width: `${mavHighPct - mavLowPct}%` }} />
              {/* Actual volume bar */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: VOLUME_STATUS_COLOR[status] }}
              />
              {/* MEV marker line */}
              <div className="absolute inset-y-0 w-px bg-foreground/30" style={{ left: `${mevPct}%` }} />
              {/* MAV band edges */}
              <div className="absolute inset-y-0 w-px bg-foreground/20" style={{ left: `${mavLowPct}%` }} />
              <div className="absolute inset-y-0 w-px bg-foreground/20" style={{ left: `${mavHighPct}%` }} />
            </div>
          </div>
        );
      })}
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No exercises scheduled yet.</p>
      )}
    </div>
  );
}
