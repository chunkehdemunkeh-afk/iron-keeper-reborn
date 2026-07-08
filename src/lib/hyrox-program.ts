/**
 * Hyrox 8-week race prep program.
 *
 * Layered on top of the Hyrox split — each week block prescribes which
 * base session IDs to run and (optionally) overrides intensity notes.
 * Progress is stored per-user in localStorage.
 */

export type HyroxWeekBlock = {
  week: number;
  phase: "Base" | "Build" | "Intensify" | "Peak" | "Taper";
  focus: string;
  /** Session IDs from HYROX_WORKOUTS (ordered by day within the week). */
  sessions: string[];
  /** Coach note shown on the home card / program screen. */
  note: string;
};

export const HYROX_PROGRAM: HyroxWeekBlock[] = [
  {
    week: 1, phase: "Base", focus: "Volume · Technique",
    sessions: ["hyrox-cr-ski", "hyrox-strength-posterior", "hyrox-erg-threshold", "hyrox-strength-power"],
    note: "Groove the movements. Prioritise clean sled mechanics and unbroken wall ball sets over speed.",
  },
  {
    week: 2, phase: "Base", focus: "Volume · Technique",
    sessions: ["hyrox-cr-ski", "hyrox-strength-posterior", "hyrox-erg-threshold", "hyrox-strength-power"],
    note: "Same sessions — push weights on strength days by 5%, hold ergs at threshold.",
  },
  {
    week: 3, phase: "Build", focus: "Full 1km CR intervals",
    sessions: ["hyrox-cr-full", "hyrox-strength-posterior", "hyrox-erg-threshold", "hyrox-strength-power"],
    note: "First full 1km CR loop. Log run times honestly — this is your baseline.",
  },
  {
    week: 4, phase: "Build", focus: "Heavier sled · deeper fatigue",
    sessions: ["hyrox-cr-full", "hyrox-strength-posterior", "hyrox-erg-threshold", "hyrox-strength-power"],
    note: "Add load to sled work. Try unbroken 25-rep wall ball sets.",
  },
  {
    week: 5, phase: "Intensify", focus: "Race-pace exposure",
    sessions: ["hyrox-cr-full", "hyrox-halfrox", "hyrox-erg-vo2", "hyrox-strength-power"],
    note: "First HalfRox simulation this week. Do not race it — practice pacing.",
  },
  {
    week: 6, phase: "Intensify", focus: "VO2 · Sharpening",
    sessions: ["hyrox-cr-sprint", "hyrox-strength-posterior", "hyrox-erg-vo2", "hyrox-halfrox"],
    note: "Highest intensity week. Sleep and eat like a pro — recovery is training.",
  },
  {
    week: 7, phase: "Peak", focus: "Race simulation",
    sessions: ["hyrox-cr-full", "hyrox-halfrox", "hyrox-erg-vo2", "hyrox-strength-power"],
    note: "Final hard week. Run a full HalfRox at 90% — nail your pacing plan.",
  },
  {
    week: 8, phase: "Taper", focus: "Sharpen · Rest",
    sessions: ["hyrox-cr-sprint", "hyrox-erg-threshold", "hyrox-strength-power"],
    note: "Volume drops ~40%. Keep intensity sharp on short intervals. Race day this week.",
  },
];

export type HyroxProgress = {
  /** ISO date (yyyy-mm-dd) when the program started. */
  startDate: string;
  /** ISO date of the race — used for countdown. Optional. */
  raceDate?: string;
};

function key(userId: string) {
  return `ik-hyrox-program-${userId}`;
}

export function getHyroxProgress(userId: string): HyroxProgress | null {
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function startHyroxProgram(userId: string, raceDate?: string): HyroxProgress {
  const today = new Date().toISOString().split("T")[0];
  const progress: HyroxProgress = { startDate: today, raceDate };
  try {
    localStorage.setItem(key(userId), JSON.stringify(progress));
  } catch {
    // ignore
  }
  return progress;
}

export function clearHyroxProgram(userId: string): void {
  try {
    localStorage.removeItem(key(userId));
  } catch {
    // ignore
  }
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + "T00:00:00").getTime();
  const to = new Date(toIso + "T00:00:00").getTime();
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

/** Returns the current 1-indexed week (1..8) based on the start date. */
export function getCurrentWeek(progress: HyroxProgress): number {
  const today = new Date().toISOString().split("T")[0];
  const daysIn = daysBetween(progress.startDate, today);
  const week = Math.floor(daysIn / 7) + 1;
  return Math.min(Math.max(week, 1), 8);
}

export function getCurrentBlock(progress: HyroxProgress): HyroxWeekBlock {
  return HYROX_PROGRAM[getCurrentWeek(progress) - 1];
}

export function daysUntilRace(progress: HyroxProgress): number | null {
  if (!progress.raceDate) return null;
  const today = new Date().toISOString().split("T")[0];
  return daysBetween(today, progress.raceDate);
}

export function isProgramComplete(progress: HyroxProgress): boolean {
  const today = new Date().toISOString().split("T")[0];
  return daysBetween(progress.startDate, today) >= 8 * 7;
}
