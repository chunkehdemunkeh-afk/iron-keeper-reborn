import Model, { type IExerciseData, type Muscle, type IMuscleStats } from "react-body-highlighter";
import type { MuscleRegion } from "@/lib/muscle-mapping";
import { MUSCLE_REGIONS } from "@/lib/muscle-mapping";
import { type VolumeStatus, VOLUME_STATUS_COLOR } from "@/lib/volume-standards";

// Copied from BodyDiagram.tsx — kept separate to avoid coupling to recovery types.
const REGION_TO_LIB: Record<MuscleRegion, Muscle[]> = {
  chest: ["chest"],
  front_delts: ["front-deltoids"],
  side_delts: [],
  rear_delts: ["back-deltoids"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearm"],
  abs: ["abs"],
  obliques: ["obliques"],
  quads: ["quadriceps"],
  hamstrings: ["hamstring"],
  glutes: ["gluteal"],
  abductors: ["abductors"],
  adductors: ["adductor"],
  calves: ["calves"],
  lats: ["upper-back"],
  traps: ["trapezius"],
  mid_back: ["upper-back"],
  lower_back: ["lower-back"],
};

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
  abductors: "abductors",
  adductor: "adductors",
  calves: "calves",
  "upper-back": "mid_back",
  trapezius: "traps",
  "lower-back": "lower_back",
};

// frequency 1–6 mapped to these colors in order
const STATUS_ORDER: VolumeStatus[] = [
  "untrained",
  "under_mev",
  "minimum",
  "optimal",
  "approaching_mrv",
  "over_mrv",
];
const STATUS_TO_FREQ: Record<VolumeStatus, number> = {
  untrained: 1,
  under_mev: 2,
  minimum: 3,
  optimal: 4,
  approaching_mrv: 5,
  over_mrv: 6,
};
const HIGHLIGHT_COLORS = STATUS_ORDER.map((s) => VOLUME_STATUS_COLOR[s]);

interface Props {
  statuses: Partial<Record<MuscleRegion, VolumeStatus>>;
  view: "front" | "back";
  onMuscleClick?: (muscle: MuscleRegion) => void;
  highlighted?: MuscleRegion | null;
}

export default function VolumeBodyDiagram({ statuses, view, onMuscleClick, highlighted }: Props) {
  // Build exercise data — one entry per status group (muscles with same frequency share an entry)
  const groupMap = new Map<number, string[]>();
  for (const muscle of MUSCLE_REGIONS) {
    const status = statuses[muscle];
    if (!status || status === "untrained") continue;
    const libMuscles = REGION_TO_LIB[muscle];
    if (!libMuscles.length) continue;
    const freq = STATUS_TO_FREQ[status];
    if (!groupMap.has(freq)) groupMap.set(freq, []);
    groupMap.get(freq)!.push(...libMuscles);
  }

  const data: IExerciseData[] = [];
  groupMap.forEach((muscles, frequency) => {
    data.push({ name: `group-${frequency}`, muscles: muscles as Muscle[], frequency } as IExerciseData);
  });

  // Highlighted muscle overlay
  const hlLibMuscles = highlighted ? REGION_TO_LIB[highlighted] : [];
  const hlData: IExerciseData[] = hlLibMuscles.length
    ? [{ name: "highlight", muscles: hlLibMuscles as Muscle[], frequency: 1 } as IExerciseData]
    : [];

  const hlColor = highlighted && statuses[highlighted]
    ? VOLUME_STATUS_COLOR[statuses[highlighted]!]
    : VOLUME_STATUS_COLOR.optimal;

  function handleClick(stats: IMuscleStats) {
    if (!onMuscleClick) return;
    const region = LIB_TO_REGION[stats.muscle];
    if (region) onMuscleClick(region);
  }

  const modelType = view === "front" ? "anterior" : "posterior";

  return (
    <div className="mx-auto w-full max-w-[240px] relative" style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.35))" }}>
      {/* Base model */}
      <Model
        data={data}
        type={modelType}
        bodyColor="hsl(220 14% 22%)"
        highlightedColors={HIGHLIGHT_COLORS}
        onClick={handleClick}
        style={{ width: "100%", height: "auto", padding: 0 }}
        svgStyle={{ width: "100%", height: "auto", cursor: onMuscleClick ? "pointer" : "default" }}
      />

      {/* Glow overlay for highlighted muscle */}
      {highlighted && hlLibMuscles.length > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ filter: `drop-shadow(0 0 6px ${hlColor}) drop-shadow(0 0 14px ${hlColor})` }}
        >
          <Model
            data={hlData}
            type={modelType}
            bodyColor="transparent"
            highlightedColors={[hlColor]}
            style={{ width: "100%", height: "auto", padding: 0 }}
            svgStyle={{ width: "100%", height: "auto" }}
          />
        </div>
      )}
    </div>
  );
}
