import { MUSCLE_LABELS, type MuscleRegion } from "@/lib/muscle-mapping";
import {
  VOLUME_STATUS_COLOR,
  VOLUME_STATUS_LABEL,
  type VolumeStatus,
  type VolumeStandard,
} from "@/lib/volume-standards";

interface Props {
  muscle: MuscleRegion;
  sets: number;
  load: number;
  strengthSets: number;
  status: VolumeStatus;
  standard: VolumeStandard;
  weeklySetCounts: number[];
  goal: "hypertrophy" | "strength";
  isHighlighted?: boolean;
  onClick?: () => void;
}

export default function MuscleVolumeRow({
  muscle,
  sets,
  strengthSets,
  status,
  standard,
  weeklySetCounts,
  goal,
  isHighlighted,
  onClick,
}: Props) {
  const displaySets = goal === "strength" ? strengthSets : sets;
  const color = VOLUME_STATUS_COLOR[status];
  const { mev, mavLow, mavHigh, mrv } = standard;
  const cap = mrv > 0 ? mrv : 30;

  // Progress bar zone stops as percentages of cap
  const mevPct = Math.round((mev / cap) * 100);
  const mavLowPct = Math.round((mavLow / cap) * 100);
  const mavHighPct = Math.round((mavHigh / cap) * 100);
  const fillPct = Math.min(Math.round((displaySets / cap) * 100), 100);

  // Sparkline
  const sparkMax = Math.max(...weeklySetCounts, mrv, 1);
  const weekLabels = ["3w", "2w", "1w", "Now"];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
        isHighlighted ? "bg-muted/40 ring-1 ring-inset" : "hover:bg-muted/20"
      }`}
      style={{ "--hl-ring": color } as React.CSSProperties}
    >
      <div className="flex items-center gap-3">
        {/* Left: name + chip */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">
              {MUSCLE_LABELS[muscle]}
            </span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
              style={{ background: `${color}22`, color }}
            >
              {VOLUME_STATUS_LABEL[status]}
            </span>
          </div>

          {/* Segmented progress bar */}
          <div className="mt-1.5 h-1.5 rounded-full overflow-hidden relative"
            style={{
              background: `linear-gradient(to right,
                hsl(213 80% 30% / 0.3) 0%,
                hsl(213 80% 30% / 0.3) ${mevPct}%,
                hsl(38 90% 40% / 0.3) ${mevPct}%,
                hsl(38 90% 40% / 0.3) ${mavLowPct}%,
                hsl(142 65% 30% / 0.3) ${mavLowPct}%,
                hsl(142 65% 30% / 0.3) ${mavHighPct}%,
                hsl(28 92% 35% / 0.3) ${mavHighPct}%,
                hsl(28 92% 35% / 0.3) 100%
              )`,
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
              style={{ width: `${fillPct}%`, background: color }}
            />
          </div>

          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {displaySets} sets{goal === "strength" && sets !== strengthSets ? ` (${sets} total)` : ""}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              target {mavLow}–{mavHigh}
            </span>
          </div>
        </div>

        {/* Right: sparkline */}
        <div className="flex items-end gap-0.5 h-8 shrink-0">
          {weeklySetCounts.map((count, i) => {
            const isNow = i === weeklySetCounts.length - 1;
            const height = Math.max(Math.round((count / sparkMax) * 100), 4);
            return (
              <div key={i} className="flex flex-col items-center gap-0.5 w-4">
                <div
                  className="w-3 rounded-sm transition-all"
                  style={{
                    height: `${height}%`,
                    background: isNow ? color : "hsl(220 14% 35%)",
                    opacity: isNow ? 1 : 0.5,
                    minHeight: 2,
                    maxHeight: "100%",
                  }}
                />
                <span className="text-[9px] text-muted-foreground">{weekLabels[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </button>
  );
}
