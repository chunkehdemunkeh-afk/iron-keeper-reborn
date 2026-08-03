import { Footprints, Timer, Gauge, Wind, Trophy } from "lucide-react";
import type { WorkoutDay, Exercise } from "./workout-data";

/**
 * Half marathon run session library.
 *
 * Same logging convention as the Hyrox sessions: `reps` stores **metres**
 * (fixed per set) and `weight` stores **elapsed seconds** (weightLabel "Sec"),
 * so pace charts work through the existing workout_sets tables with no
 * schema change. Recovery/rest entries store seconds in `reps` and are not
 * weight-tracked.
 *
 * Pace targets throughout assume a sub-2:00 half (5:41/km race pace).
 */

/** Expand a template over N rounds with per-round unique IDs. */
function rounds(count: number, template: Omit<Exercise, "sets">[], group = "A"): Exercise[] {
  const out: Exercise[] = [];
  for (let r = 1; r <= count; r++) {
    for (const ex of template) {
      out.push({
        ...ex,
        id: `${ex.id}-r${r}`,
        name: `${ex.name} · Rd ${r}`,
        sets: 1,
        supersetGroup: group,
      });
    }
  }
  return out;
}

const EASY_COLOR = "from-emerald-500/25 to-teal-500/10";
const SPEED_COLOR = "from-violet-500/25 to-fuchsia-500/10";
const TEMPO_COLOR = "from-sky-500/25 to-blue-500/10";
const LONG_COLOR = "from-amber-500/25 to-orange-500/10";

function warmupCooldown(prefix: string): { warm: Exercise; cool: Exercise } {
  return {
    warm: {
      id: `${prefix}-wu`, name: "Warm-up Jog 1km", sets: 1, reps: "1000",
      targetMuscle: "Aerobic", notes: "Very easy — 7:30/km or slower. Add leg swings and ankle circles after.",
      trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
    },
    cool: {
      id: `${prefix}-cd`, name: "Cool-down Jog 1km", sets: 1, reps: "1000",
      targetMuscle: "Recovery", notes: "Shake it out. Stretch calves, hamstrings and hip flexors afterwards.",
      trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
    },
  };
}

export const RUN_WORKOUTS: WorkoutDay[] = [
  // ── Easy / recovery ────────────────────────────────────────────────
  {
    id: "run-easy-30",
    name: "Run · Easy 30 min",
    icon: Footprints,
    day: "Easy Run",
    focus: "5km conversational pace",
    color: EASY_COLOR,
    targetRir: "3+",
    exercises: [
      {
        id: "rn-easy-5k", name: "Easy Run 5km", sets: 1, reps: "5000",
        targetMuscle: "Aerobic Base",
        notes: "6:45–7:15/km. You should be able to hold a full conversation. This run builds the engine — resist going faster.",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
      },
    ],
  },
  {
    id: "run-easy-40",
    name: "Run · Easy 40 min",
    icon: Footprints,
    day: "Easy Run",
    focus: "6km aerobic volume",
    color: EASY_COLOR,
    targetRir: "3+",
    exercises: [
      {
        id: "rn-easy-6k", name: "Easy Run 6km", sets: 1, reps: "6000",
        targetMuscle: "Aerobic Base",
        notes: "6:45–7:15/km. Nasal breathing test — if you can't breathe through your nose, slow down.",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
      },
    ],
  },
  {
    id: "run-easy-45",
    name: "Run · Easy 45 min",
    icon: Footprints,
    day: "Easy Run",
    focus: "7km aerobic volume",
    color: EASY_COLOR,
    targetRir: "3+",
    exercises: [
      {
        id: "rn-easy-7k", name: "Easy Run 7km", sets: 1, reps: "7000",
        targetMuscle: "Aerobic Base",
        notes: "6:45–7:15/km. Keep cadence high (~175 steps/min) even though the pace is slow.",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
      },
    ],
  },
  {
    id: "run-strides",
    name: "Run · Easy + Strides",
    icon: Wind,
    day: "Easy Run",
    focus: "5km easy + 6× 100m strides",
    color: EASY_COLOR,
    targetRir: "2-3",
    exercises: [
      {
        id: "rn-easy-5k-b", name: "Easy Run 5km", sets: 1, reps: "5000",
        targetMuscle: "Aerobic Base", notes: "6:45–7:15/km before the strides.",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
      },
      {
        id: "rn-stride-100", name: "Stride 100m", sets: 6, reps: "100",
        targetMuscle: "Running Economy",
        notes: "Build to ~95% over 100m, relaxed face and shoulders. Walk back to recover fully between each.",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
      },
    ],
  },

  // ── Speed / VO2 ────────────────────────────────────────────────────
  {
    id: "run-int-400",
    name: "Run · 8× 400m",
    icon: Timer,
    day: "Intervals",
    focus: "400m reps @ 1:55–2:00 · 90s jog recovery",
    color: SPEED_COLOR,
    targetRir: "0-1",
    exercises: (() => {
      const { warm, cool } = warmupCooldown("rn-i400");
      return [
        warm,
        ...rounds(8, [
          {
            id: "rn-int-400", name: "400m Rep", reps: "400", targetMuscle: "VO2 Max",
            notes: "Target 1:55–2:00 (4:50/km). Even splits — the last rep should match the first.",
            trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
          },
          {
            id: "rn-i400-rec", name: "Jog Recovery 90s", reps: "90", targetMuscle: "Recovery",
            notes: "Slow jog, keep moving.", trackWeight: false, repLabel: "Sec",
          },
        ]),
        cool,
      ];
    })(),
  },
  {
    id: "run-int-800",
    name: "Run · 6× 800m",
    icon: Timer,
    day: "Intervals",
    focus: "800m reps @ 4:00–4:10 · 2 min jog recovery",
    color: SPEED_COLOR,
    targetRir: "0-1",
    exercises: (() => {
      const { warm, cool } = warmupCooldown("rn-i800");
      return [
        warm,
        ...rounds(6, [
          {
            id: "rn-int-800", name: "800m Rep", reps: "800", targetMuscle: "VO2 Max",
            notes: "Target 4:00–4:10 (5:05/km). Hard but controlled — you should finish rep 6 able to do one more.",
            trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
          },
          {
            id: "rn-i800-rec", name: "Jog Recovery 2 min", reps: "120", targetMuscle: "Recovery",
            notes: "Easy jog — don't stand still.", trackWeight: false, repLabel: "Sec",
          },
        ]),
        cool,
      ];
    })(),
  },
  {
    id: "run-int-1k",
    name: "Run · 5× 1km",
    icon: Timer,
    day: "Intervals",
    focus: "1km reps @ 5:05–5:15 · 2 min jog recovery",
    color: SPEED_COLOR,
    targetRir: "0-1",
    exercises: (() => {
      const { warm, cool } = warmupCooldown("rn-i1k");
      return [
        warm,
        ...rounds(5, [
          {
            id: "rn-int-1k", name: "1km Rep", reps: "1000", targetMuscle: "VO2 Max",
            notes: "Target 5:05–5:15. This is the key session for lifting your race pace ceiling.",
            trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
          },
          {
            id: "rn-i1k-rec", name: "Jog Recovery 2 min", reps: "120", targetMuscle: "Recovery",
            notes: "Easy jog.", trackWeight: false, repLabel: "Sec",
          },
        ]),
        cool,
      ];
    })(),
  },
  {
    id: "run-int-200",
    name: "Run · 10× 200m Sharpener",
    icon: Wind,
    day: "Intervals",
    focus: "Short sharp reps @ 52–55s · full recovery",
    color: SPEED_COLOR,
    targetRir: "1-2",
    exercises: (() => {
      const { warm, cool } = warmupCooldown("rn-i200");
      return [
        warm,
        ...rounds(10, [
          {
            id: "rn-int-200", name: "200m Rep", reps: "200", targetMuscle: "Leg Speed",
            notes: "52–55s, smooth and fast — not a sprint. Taper session: stay well clear of failure.",
            trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
          },
          {
            id: "rn-i200-rec", name: "Walk/Jog Recovery 60s", reps: "60", targetMuscle: "Recovery",
            notes: "Full recovery — quality over fatigue.", trackWeight: false, repLabel: "Sec",
          },
        ]),
        cool,
      ];
    })(),
  },

  // ── Tempo / threshold ──────────────────────────────────────────────
  {
    id: "run-tempo-3k",
    name: "Run · 3km Tempo",
    icon: Gauge,
    day: "Tempo",
    focus: "3km continuous @ 5:35–5:45/km",
    color: TEMPO_COLOR,
    targetRir: "1-2",
    exercises: (() => {
      const { warm, cool } = warmupCooldown("rn-t3k");
      return [
        warm,
        {
          id: "rn-tempo-3k", name: "Tempo 3km", sets: 1, reps: "3000",
          targetMuscle: "Lactate Threshold",
          notes: "Goal race pace — 5:41/km. Comfortably hard: you can speak in short phrases, not sentences.",
          trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
        },
        cool,
      ];
    })(),
  },
  {
    id: "run-tempo-5k",
    name: "Run · 5km Tempo",
    icon: Gauge,
    day: "Tempo",
    focus: "5km continuous @ 5:35–5:45/km",
    color: TEMPO_COLOR,
    targetRir: "0-1",
    exercises: (() => {
      const { warm, cool } = warmupCooldown("rn-t5k");
      return [
        warm,
        {
          id: "rn-tempo-5k", name: "Tempo 5km", sets: 1, reps: "5000",
          targetMuscle: "Lactate Threshold",
          notes: "Hold 5:41/km. This is your best predictor of race readiness — log it honestly.",
          trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
        },
        cool,
      ];
    })(),
  },
  {
    id: "run-tempo-2x3k",
    name: "Run · 2× 3km Threshold",
    icon: Gauge,
    day: "Tempo",
    focus: "2× 3km @ 5:25–5:35 · 3 min float",
    color: TEMPO_COLOR,
    targetRir: "0-1",
    exercises: (() => {
      const { warm, cool } = warmupCooldown("rn-t2x3k");
      return [
        warm,
        ...rounds(2, [
          {
            id: "rn-thr-3k", name: "Threshold 3km", reps: "3000", targetMuscle: "Lactate Threshold",
            notes: "Slightly faster than race pace — 5:25–5:35/km.",
            trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
          },
          {
            id: "rn-t2x3k-rec", name: "Float 3 min", reps: "180", targetMuscle: "Recovery",
            notes: "Easy jog, don't stop.", trackWeight: false, repLabel: "Sec",
          },
        ]),
        cool,
      ];
    })(),
  },
  {
    id: "run-progression-8k",
    name: "Run · 8km Progression",
    icon: Gauge,
    day: "Tempo",
    focus: "Easy → race pace → faster, 8km",
    color: TEMPO_COLOR,
    targetRir: "0-1",
    exercises: [
      {
        id: "rn-prog-1", name: "Progression 3km · Easy", sets: 1, reps: "3000", targetMuscle: "Aerobic",
        notes: "6:45/km. Relaxed start.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A",
      },
      {
        id: "rn-prog-2", name: "Progression 3km · Race Pace", sets: 1, reps: "3000", targetMuscle: "Race Pace",
        notes: "5:41/km. Lock into goal rhythm.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A",
      },
      {
        id: "rn-prog-3", name: "Progression 2km · Fast Finish", sets: 1, reps: "2000", targetMuscle: "Lactate Threshold",
        notes: "5:20–5:30/km. Teaches you to finish strong on tired legs.", trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A",
      },
    ],
  },

  // ── Long runs ──────────────────────────────────────────────────────
  ...([
    { km: 8, id: "run-long-8", note: "Taper long run. Easy the whole way — the fitness is already banked." },
    { km: 10, id: "run-long-10", note: "6:30–7:00/km. Practise fuelling: sip water every 20 min." },
    { km: 12, id: "run-long-12", note: "6:30–7:00/km. Take a gel at 45 min even if you don't feel you need it." },
    { km: 13, id: "run-long-13", note: "6:30–7:00/km. Run the route you'll race on if you can." },
    { km: 15, id: "run-long-15", note: "6:30–7:00/km. Wear your race shoes and race kit from here on." },
    { km: 18, id: "run-long-18", note: "Longest run of the block. 6:30–7:00/km — time on feet, not pace." },
  ] as const).map<WorkoutDay>(({ km, id, note }) => ({
    id,
    name: `Run · Long ${km}km`,
    icon: Footprints,
    day: "Long Run",
    focus: `${km}km steady · the key weekly session`,
    color: LONG_COLOR,
    targetRir: "2-3",
    exercises: [
      {
        id: `rn-long-${km}k`, name: `Long Run ${km}km`, sets: 1, reps: `${km * 1000}`,
        targetMuscle: "Aerobic Endurance", notes: note,
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres",
      },
    ],
  })),
  {
    id: "run-long-14-rp",
    name: "Run · Long 14km w/ Race Pace",
    icon: Trophy,
    day: "Long Run",
    focus: "8km easy + 2× 3km at goal pace",
    color: LONG_COLOR,
    targetRir: "0-1",
    exercises: [
      {
        id: "rn-lrp-easy", name: "Easy 8km", sets: 1, reps: "8000", targetMuscle: "Aerobic Endurance",
        notes: "6:45/km. Deliberately steady — the race-pace work comes after.",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A",
      },
      {
        id: "rn-lrp-rp1", name: "Race Pace 3km · Block 1", sets: 1, reps: "3000", targetMuscle: "Race Pace",
        notes: "5:41/km on tired legs — this is the race simulation.",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A",
      },
      {
        id: "rn-lrp-rp2", name: "Race Pace 3km · Block 2", sets: 1, reps: "3000", targetMuscle: "Race Pace",
        notes: "Hold 5:41/km. If you nail this, sub-2:00 is on.",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A",
      },
    ],
  },

  // ── Race day ───────────────────────────────────────────────────────
  {
    id: "run-race-half",
    name: "Run · Half Marathon 21.1km",
    icon: Trophy,
    day: "Race Day",
    focus: "Race · goal sub 2:00 (5:41/km)",
    color: "from-yellow-500/25 to-orange-500/10",
    targetRir: "0-1",
    exercises: [
      {
        id: "rn-race-5k-1", name: "Race Split 0–5km", sets: 1, reps: "5000", targetMuscle: "Race Pace",
        notes: "Hold back — 5:45/km here. Everyone goes out too fast.",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A",
      },
      {
        id: "rn-race-5k-2", name: "Race Split 5–10km", sets: 1, reps: "5000", targetMuscle: "Race Pace",
        notes: "Settle at 5:41/km. Take your first gel around 45 min.",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A",
      },
      {
        id: "rn-race-5k-3", name: "Race Split 10–15km", sets: 1, reps: "5000", targetMuscle: "Race Pace",
        notes: "The grind. Shorten your focus — one km at a time.",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A",
      },
      {
        id: "rn-race-5k-4", name: "Race Split 15–20km", sets: 1, reps: "5000", targetMuscle: "Race Pace",
        notes: "Second gel at ~1:30. Empty the tank from 18km.",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A",
      },
      {
        id: "rn-race-1k1", name: "Race Finish 20–21.1km", sets: 1, reps: "1100", targetMuscle: "Race Pace",
        notes: "Everything you have left.",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "A",
      },
      {
        id: "rn-race-21k", name: "Full Half Marathon 21.1km", sets: 1, reps: "21100", targetMuscle: "Race Result",
        notes: "Log your official finish time in seconds (1:59:59 = 7199).",
        trackWeight: true, weightLabel: "Sec", repLabel: "Metres", supersetGroup: "B",
      },
    ],
  },
];

export const RUN_WORKOUT_IDS = new Set(RUN_WORKOUTS.map((w) => w.id));

export function isRunWorkout(workoutId: string): boolean {
  return RUN_WORKOUT_IDS.has(workoutId);
}

/** Grouped for the session swap sheet / programme page. */
export const RUN_SESSION_GROUPS = [
  {
    label: "Easy & Recovery",
    description: "Conversational aerobic volume — most of your weekly kilometres.",
    ids: ["run-easy-30", "run-easy-40", "run-easy-45", "run-strides"],
  },
  {
    label: "Speed & VO2",
    description: "Short reps that lift your pace ceiling.",
    ids: ["run-int-200", "run-int-400", "run-int-800", "run-int-1k"],
  },
  {
    label: "Tempo & Threshold",
    description: "Sustained goal-pace work — the strongest race predictor.",
    ids: ["run-tempo-3k", "run-tempo-5k", "run-tempo-2x3k", "run-progression-8k"],
  },
  {
    label: "Long Runs",
    description: "The key weekly session — endurance and fuelling practice.",
    ids: ["run-long-8", "run-long-10", "run-long-12", "run-long-13", "run-long-15", "run-long-18", "run-long-14-rp"],
  },
  {
    label: "Race",
    description: "Race-day split logging.",
    ids: ["run-race-half"],
  },
];

// ── Benchmark catalog ────────────────────────────────────────────────
export type RunBenchmarkDef = {
  key: string;
  label: string;
  category: "speed" | "tempo" | "long" | "race";
  /** Fixed distance in metres — used for pace calculation. */
  distance: number;
  /** Base exercise IDs (round suffixes `-r{n}` are matched automatically). */
  exerciseIds: string[];
};

export const RUN_BENCHMARKS: RunBenchmarkDef[] = [
  { key: "run-200",  label: "200m Rep",       category: "speed", distance: 200,  exerciseIds: ["rn-int-200"] },
  { key: "run-400",  label: "400m Rep",       category: "speed", distance: 400,  exerciseIds: ["rn-int-400"] },
  { key: "run-800",  label: "800m Rep",       category: "speed", distance: 800,  exerciseIds: ["rn-int-800"] },
  { key: "run-1k",   label: "1km Rep",        category: "speed", distance: 1000, exerciseIds: ["rn-int-1k"] },
  { key: "tempo-3k", label: "3km Tempo",      category: "tempo", distance: 3000, exerciseIds: ["rn-tempo-3k", "rn-thr-3k"] },
  { key: "tempo-5k", label: "5km Tempo",      category: "tempo", distance: 5000, exerciseIds: ["rn-tempo-5k"] },
  { key: "race-3k",  label: "3km @ Race Pace", category: "tempo", distance: 3000, exerciseIds: ["rn-lrp-rp1", "rn-lrp-rp2", "rn-prog-2"] },
  { key: "long-10k", label: "10km Long Run",  category: "long",  distance: 10000, exerciseIds: ["rn-long-10k"] },
  { key: "long-15k", label: "15km Long Run",  category: "long",  distance: 15000, exerciseIds: ["rn-long-15k"] },
  { key: "long-18k", label: "18km Long Run",  category: "long",  distance: 18000, exerciseIds: ["rn-long-18k"] },
  { key: "half",     label: "Half Marathon",  category: "race",  distance: 21100, exerciseIds: ["rn-race-21k"] },
];

/** Riegel race-time prediction from a shorter effort. */
export function predictHalfSeconds(seconds: number, distanceM: number): number {
  return seconds * Math.pow(21100 / distanceM, 1.06);
}
