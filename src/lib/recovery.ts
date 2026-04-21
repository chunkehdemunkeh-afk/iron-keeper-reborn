// Pure calculation module — computes per-muscle recovery state from
// recent workout sets, sleep logs, and the user's training split.

import {
  MUSCLE_REGIONS,
  RECOVERY_HOURS,
  getMusclesWorked,
  type MuscleRegion,
} from "./muscle-mapping";
import {
  DEFAULT_RECOVERY_SETTINGS,
  recoveryWindowMultiplier,
  type RecoverySettings,
} from "./recovery-settings";

export type RecoveryStatus = "fatigued" | "workable" | "recovered" | "rested";

export interface MuscleState {
  region: MuscleRegion;
  score: number;             // 0..1, 1 = fully recovered
  status: RecoveryStatus;
  lastWorkedAt: string | null; // ISO date string
  lastVolume: number;          // weight × reps from last session
  hoursUntilReady: number;     // 0 if ready
}

export interface SetRecord {
  exerciseId: string;
  exerciseName: string;
  targetMuscle?: string;
  muscleGroup?: string;
  weight: number;
  reps: number;
  workoutDate: string; // ISO string
}

export interface SleepLog {
  date: string;     // YYYY-MM-DD (the morning the user woke on)
  hours: number;
  quality: number;  // 1..5
}

const SECONDARY_MULTIPLIER = 0.4;

export function getIntensityMultiplier(splitId: string | null | undefined): number {
  switch (splitId) {
    case "ppl":
    case "bro":
      return 1.30;
    case "pplu":
    case "pplul":
      return 1.20;
    case "arnold":
      return 1.15;
    case "upper_lower":
      return 1.10;
    case "fullbody":
    case "531":
      return 1.00;
    case "gk":
      return 0.85;
    default:
      return 1.00;
  }
}

/**
 * Returns sleep modifier based on the night BEFORE a given workout date.
 * Higher = more fatigue accrual (worse recovery).
 */
export function getSleepModifier(
  workoutDate: Date,
  sleepLogs: SleepLog[],
  weight: number = 1,
): number {
  // Sleep log "date" = the morning you woke. The night before workoutDate
  // is the sleep log dated `workoutDate` (you slept that previous night,
  // and it's been logged with the date you woke up on workout day).
  const targetDate = workoutDate.toISOString().split("T")[0];
  const log = sleepLogs.find((l) => l.date === targetDate);

  let baseMod: number;
  if (!log) baseMod = 1.20;
  else if (log.hours >= 8 && log.quality >= 4) baseMod = 0.90;
  else if (log.hours >= 7 && log.quality >= 3) baseMod = 1.00;
  else if (log.hours >= 6 || log.quality >= 2) baseMod = 1.10;
  else baseMod = 1.20;

  // Scale deviation from neutral (1.0) by `weight`.
  // weight=0 → no impact (always 1), weight=1 → default, weight=2 → doubled effect.
  const w = Math.max(0, Math.min(2, weight));
  return 1 + (baseMod - 1) * w;
}

/**
 * Compute the recovery state for every muscle region, given recent sets
 * (last ~7 days), the user's logged sleep, the split, and "now".
 */
export function computeMuscleRecovery(
  sets: SetRecord[],
  sleepLogs: SleepLog[],
  splitId: string | null | undefined,
  now: Date = new Date(),
  settings: RecoverySettings = DEFAULT_RECOVERY_SETTINGS,
): Record<MuscleRegion, MuscleState> {
  const intensity = getIntensityMultiplier(splitId);
  const windowMult = recoveryWindowMultiplier(settings.model);
  const result: Record<MuscleRegion, MuscleState> = {} as any;

  // Initialise all regions as fully rested
  for (const region of MUSCLE_REGIONS) {
    result[region] = {
      region,
      score: 1,
      status: "rested",
      lastWorkedAt: null,
      lastVolume: 0,
      hoursUntilReady: 0,
    };
  }

  // Group sets by exerciseId+date so we accumulate per session
  for (const set of sets) {
    if (!set.weight || !set.reps) continue;
    const volume = set.weight * set.reps;
    if (volume <= 0) continue;

    const workoutDate = new Date(set.workoutDate);
    const sleepMod = getSleepModifier(workoutDate, sleepLogs, settings.sleepWeight);
    const fatiguePerSet = volume * intensity * sleepMod;

    const hits = getMusclesWorked(set.exerciseId, set.exerciseName, set.targetMuscle, set.muscleGroup);

    const apply = (region: MuscleRegion, weight: number) => {
      const elapsedHours = (now.getTime() - workoutDate.getTime()) / 3_600_000;
      const recoveryHours = RECOVERY_HOURS[region] * windowMult;
      // Decay: 0 = just done, 1 = fully recovered
      const decay = Math.min(1, Math.max(0, elapsedHours / recoveryHours));
      // Fatigue contribution scaled by how recent (newer = more fatigue remaining)
      const remainingFatigue = (1 - decay) * weight;

      const state = result[region];
      // Track the most fatiguing recent contribution
      const candidateScore = 1 - Math.min(1, remainingFatigue / 1500); // normalise: 1500 fatigue ≈ fully spent
      if (candidateScore < state.score) {
        state.score = candidateScore;
      }
      // Track the most recent session
      if (!state.lastWorkedAt || workoutDate > new Date(state.lastWorkedAt)) {
        state.lastWorkedAt = set.workoutDate;
        state.lastVolume = volume;
      } else if (workoutDate.toISOString().split("T")[0] === state.lastWorkedAt.split("T")[0]) {
        state.lastVolume += volume;
      }
    };

    for (const region of hits.primary) apply(region, fatiguePerSet);
    for (const region of hits.secondary) apply(region, fatiguePerSet * SECONDARY_MULTIPLIER);
  }

  // Derive status + hours-until-ready
  for (const region of MUSCLE_REGIONS) {
    const state = result[region];
    state.score = Math.max(0, Math.min(1, state.score));
    if (!state.lastWorkedAt) {
      state.status = "rested";
    } else if (state.score < 0.5) {
      state.status = "fatigued";
    } else if (state.score < 0.85) {
      state.status = "workable";
    } else {
      state.status = "recovered";
    }
    if (state.lastWorkedAt && state.score < 1) {
      const elapsed = (now.getTime() - new Date(state.lastWorkedAt).getTime()) / 3_600_000;
      state.hoursUntilReady = Math.max(0, RECOVERY_HOURS[region] * windowMult - elapsed);
    }
  }

  return result;
}

export function statusColor(status: RecoveryStatus): string {
  switch (status) {
    case "fatigued": return "hsl(351 85% 60%)";    // rose-500
    case "workable": return "hsl(38 95% 60%)";     // amber-400
    case "recovered": return "hsl(152 70% 50%)";   // emerald-400
    case "rested": return "hsl(152 70% 50%)";      // emerald-400 — fresh = ready to train
  }
}

export function statusLabel(status: RecoveryStatus): string {
  switch (status) {
    case "fatigued": return "Fatigued";
    case "workable": return "Workable";
    case "recovered": return "Recovered";
    case "rested": return "Rested";
  }
}
