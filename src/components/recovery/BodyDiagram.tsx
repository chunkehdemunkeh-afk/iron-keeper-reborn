import { useMemo, useState } from "react";
import Model, { type IExerciseData, type Muscle, type IMuscleStats } from "react-body-highlighter";
import type { MuscleRegion } from "@/lib/muscle-mapping";
import { MUSCLE_LABELS } from "@/lib/muscle-mapping";
import type { MuscleState, RecoveryStatus } from "@/lib/recovery";
import { statusColor, statusLabel } from "@/lib/recovery";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Props {
  states: Record<MuscleRegion, MuscleState>;
  view?: "front" | "back";
  interactive?: boolean;
  size?: "sm" | "lg";
  /** Externally-controlled muscle highlight (e.g. clicked from a list). */
  highlighted?: MuscleRegion | null;
}

/**
 * Anatomical body diagram backed by `react-body-highlighter`.
 * - Each muscle is colored by its recovery status (rose / amber / emerald / muted).
 * - Click a muscle to open a sheet with its details.
 * - External `highlighted` prop dims the base model and overlays a glowing copy of that muscle.
 */

// Map our internal muscle regions → library muscle names.
// Some regions don't exist as separate muscles in the library and are merged.
const REGION_TO_LIB: Record<MuscleRegion, Muscle[]> = {
  chest: ["chest"],
  front_delts: ["front-deltoids"],
  side_delts: ["front-deltoids"], // library has no side delt — merge with front
  rear_delts: ["back-deltoids"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearm"],
  abs: ["abs"],
  obliques: ["obliques"],
  quads: ["quadriceps"],
  hamstrings: ["hamstring"],
  glutes: ["gluteal"],
  calves: ["calves"],
  lats: ["upper-back"], // front view: no separate lat path; back view uses upper-back
  traps: ["trapezius"],
  mid_back: ["upper-back"],
  lower_back: ["lower-back"],
};

// Reverse: which of our regions does a library muscle correspond to?
const LIB_TO_REGION: Partial<Record<Muscle, MuscleRegion>> = {
  chest: "chest",
  "front-deltoids": "front_delts",
  "back-deltoids": "rear_delts",
  biceps: "biceps",
  triceps: "triceps",
  forearm: "forearms",
  abs: "abs",
  obliques: "obliques",
  quadriceps: "quads",
  hamstring: "hamstrings",
  gluteal: "glutes",
  calves: "calves",
  "upper-back": "mid_back",
  trapezius: "traps",
  "lower-back": "lower_back",
};

// Frequency → color buckets. We use frequency as a status index, NOT a count.
// frequency 1 = rested, 2 = recovered, 3 = workable, 4 = fatigued.
const STATUS_TO_FREQUENCY: Record<RecoveryStatus, number> = {
  rested: 1,
  recovered: 2,
  workable: 3,
  fatigued: 4,
};

const HIGHLIGHTED_COLORS = [
  statusColor("rested"),
  statusColor("recovered"),
  statusColor("workable"),
  statusColor("fatigued"),
];

const BODY_COLOR = "hsl(220 14% 22%)";

export default function BodyDiagram({
  states,
  view = "front",
  interactive = true,
  size = "lg",
  highlighted = null,
}: Props) {
  const [selected, setSelected] = useState<MuscleRegion | null>(null);

  // Build one IExerciseData entry per status bucket. The library colors
  // each muscle according to the highest-frequency entry it appears in.
  const data: IExerciseData[] = useMemo(() => {
    const buckets: Record<RecoveryStatus, Set<Muscle>> = {
      rested: new Set(),
      recovered: new Set(),
      workable: new Set(),
      fatigued: new Set(),
    };

    (Object.keys(states) as MuscleRegion[]).forEach((region) => {
      const status = states[region]?.status;
      if (!status) return;
      REGION_TO_LIB[region]?.forEach((m) => buckets[status].add(m));
    });

    return (Object.keys(buckets) as RecoveryStatus[])
      .filter((s) => buckets[s].size > 0)
      .map((status) => ({
        name: status,
        muscles: Array.from(buckets[status]),
        frequency: STATUS_TO_FREQUENCY[status],
      }));
  }, [states]);

  // Overlay data for the highlighted muscle (a glowing copy).
  const highlightData: IExerciseData[] | null = useMemo(() => {
    if (!highlighted) return null;
    const muscles = REGION_TO_LIB[highlighted];
    if (!muscles?.length) return null;
    return [{ name: "highlight", muscles, frequency: 1 }];
  }, [highlighted]);

  const highlightColor = useMemo(() => {
    if (!highlighted) return null;
    return statusColor(states[highlighted]?.status ?? "workable");
  }, [highlighted, states]);

  const dim = size === "lg" ? "w-full max-w-[280px]" : "w-full max-w-[120px]";
  const hasHighlight = !!highlighted && !!highlightData;

  const handleClick = (stats: IMuscleStats) => {
    if (!interactive) return;
    const region = LIB_TO_REGION[stats.muscle];
    if (region) setSelected(region);
  };

  return (
    <>
      <div
        className={`mx-auto ${dim} relative`}
        style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.35))" }}
      >
        <div
          style={{
            opacity: hasHighlight ? 0.25 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          <Model
            data={data}
            type={view === "front" ? "anterior" : "posterior"}
            bodyColor={BODY_COLOR}
            highlightedColors={HIGHLIGHTED_COLORS}
            onClick={handleClick}
            style={{ width: "100%", height: "auto", padding: 0 }}
            svgStyle={{ width: "100%", height: "auto", cursor: interactive ? "pointer" : "default" }}
          />
        </div>
        {hasHighlight && highlightData && highlightColor && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              filter: `drop-shadow(0 0 8px ${highlightColor}) drop-shadow(0 0 16px ${highlightColor})`,
            }}
          >
            <Model
              data={highlightData}
              type={view === "front" ? "anterior" : "posterior"}
              bodyColor="transparent"
              highlightedColors={[highlightColor]}
              style={{ width: "100%", height: "auto", padding: 0 }}
              svgStyle={{ width: "100%", height: "auto" }}
            />
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: statusColor(states[selected].status) }}
                  />
                  {MUSCLE_LABELS[selected]}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 pb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</p>
                    <p className="text-base font-bold" style={{ color: statusColor(states[selected].status) }}>
                      {statusLabel(states[selected].status)}
                    </p>
                  </div>
                  <div className="glass-card rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Recovery</p>
                    <p className="text-base font-bold text-foreground">
                      {Math.round(states[selected].score * 100)}%
                    </p>
                  </div>
                </div>
                {states[selected].lastWorkedAt ? (
                  <div className="glass-card rounded-lg p-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Last Worked</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(states[selected].lastWorkedAt!).toLocaleDateString("en-GB", {
                        weekday: "long", day: "numeric", month: "short",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Volume: {Math.round(states[selected].lastVolume)} kg
                      {states[selected].hoursUntilReady > 0 && (
                        <> · Ready in ~{Math.round(states[selected].hoursUntilReady)}h</>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No recent training logged for this muscle.
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Returns which view ("front" or "back") best displays a given muscle region. */
export function viewForMuscle(region: MuscleRegion): "front" | "back" {
  const backOnly: MuscleRegion[] = ["lats", "rear_delts", "traps", "mid_back", "lower_back", "hamstrings", "glutes"];
  return backOnly.includes(region) ? "back" : "front";
}
