/**
 * 8-week half marathon program (base-builder, 4 runs/week).
 *
 * Layered on top of the run session library — each week block prescribes
 * which sessions to run plus a coach note. Progress is stored per-user in
 * localStorage, mirroring the Hyrox program.
 */

export type HMWeekBlock = {
  week: number;
  phase: "Base" | "Build" | "Cutback" | "Peak" | "Sharpen" | "Taper";
  focus: string;
  /** Approximate weekly volume in km (excluding warm-up/cool-down jogs). */
  volumeKm: number;
  /** Session IDs from RUN_WORKOUTS, in the order they should be run. */
  sessions: string[];
  note: string;
};

export const HM_PROGRAM: HMWeekBlock[] = [
  {
    week: 1, phase: "Base", focus: "Easy volume · first 400m reps", volumeKm: 22,
    sessions: ["run-easy-30", "run-int-400", "run-strides", "run-long-10"],
    note: "Everything except the reps should feel too easy. Put the long run 48h after your heaviest leg day.",
  },
  {
    week: 2, phase: "Base", focus: "Add a tempo · long run to 12km", volumeKm: 26,
    sessions: ["run-easy-40", "run-int-400", "run-tempo-3k", "run-long-12"],
    note: "First tempo — 5:41/km should feel controlled. If it doesn't, you're not slow, you're just early in the block.",
  },
  {
    week: 3, phase: "Build", focus: "800m reps · 5km tempo", volumeKm: 28,
    sessions: ["run-easy-40", "run-int-800", "run-tempo-5k", "run-long-13"],
    note: "The 5km tempo is your first honest fitness check. Log it — it feeds the finish-time projection.",
  },
  {
    week: 4, phase: "Cutback", focus: "Recovery week · volume down 25%", volumeKm: 22,
    sessions: ["run-easy-30", "run-strides", "run-tempo-3k", "run-long-10"],
    note: "Absorb the work. Keep lifting normal, sleep 8h, and let the legs come back before the big three weeks.",
  },
  {
    week: 5, phase: "Build", focus: "1km reps · long run 15km", volumeKm: 32,
    sessions: ["run-easy-45", "run-int-1k", "run-tempo-5k", "run-long-15"],
    note: "1km reps at 5:05–5:15 make race pace feel slow. Wear your race shoes on the long run from here.",
  },
  {
    week: 6, phase: "Peak", focus: "Biggest week · long run 18km", volumeKm: 36,
    sessions: ["run-easy-45", "run-int-1k", "run-tempo-2x3k", "run-long-18"],
    note: "Peak week. Practise your exact race breakfast before the 18km and take gels on schedule.",
  },
  {
    week: 7, phase: "Sharpen", focus: "Race-pace blocks inside the long run", volumeKm: 28,
    sessions: ["run-easy-40", "run-int-800", "run-progression-8k", "run-long-14-rp"],
    note: "The 14km with two race-pace blocks is the dress rehearsal. Nail 5:41/km and the race is a formality.",
  },
  {
    week: 8, phase: "Taper", focus: "Volume down 50% · race Oct 4", volumeKm: 16,
    sessions: ["run-easy-30", "run-int-200", "run-long-8", "run-race-half"],
    note: "Nothing you do this week makes you fitter — it only makes you fresher. Carbs up 2 days out, easy on the legs, trust the block.",
  },
];

export type HMProgress = {
  /** ISO date (yyyy-mm-dd) the program started. */
  startDate: string;
  /** ISO date of the race. */
  raceDate?: string;
  /** Goal finish time in seconds (e.g. 7200 = 2:00:00). */
  goalSeconds?: number;
};

/** Default goal — sub 2 hours. */
export const DEFAULT_GOAL_SECONDS = 7200;

function key(userId: string) {
  return `ik-hm-program-${userId}`;
}

export function getHMProgress(userId: string): HMProgress | null {
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function startHMProgram(userId: string, raceDate?: string, goalSeconds?: number): HMProgress {
  const today = new Date().toISOString().split("T")[0];
  const progress: HMProgress = { startDate: today, raceDate, goalSeconds };
  try {
    localStorage.setItem(key(userId), JSON.stringify(progress));
  } catch {
    // ignore
  }
  return progress;
}

export function clearHMProgram(userId: string): void {
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

/** Current 1-indexed week (1..8). */
export function getCurrentHMWeek(progress: HMProgress): number {
  const today = new Date().toISOString().split("T")[0];
  const week = Math.floor(daysBetween(progress.startDate, today) / 7) + 1;
  return Math.min(Math.max(week, 1), 8);
}

export function getCurrentHMBlock(progress: HMProgress): HMWeekBlock {
  return HM_PROGRAM[getCurrentHMWeek(progress) - 1];
}

export function daysUntilRace(progress: HMProgress): number | null {
  if (!progress.raceDate) return null;
  const today = new Date().toISOString().split("T")[0];
  return daysBetween(today, progress.raceDate);
}

export function isHMProgramComplete(progress: HMProgress): boolean {
  const today = new Date().toISOString().split("T")[0];
  return daysBetween(progress.startDate, today) >= 8 * 7;
}

/** Goal pace in seconds per km. */
export function goalPaceSecPerKm(goalSeconds = DEFAULT_GOAL_SECONDS): number {
  return goalSeconds / 21.1;
}

/** Format seconds as h:mm:ss or m:ss. */
export function formatDuration(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "—";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/** Parse "1:59:30" / "1:59" / "115" into seconds, or null. */
export function parseGoalTime(input: string): number | null {
  const parts = input.trim().split(":").map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60; // h:mm
  if (parts.length === 1) return parts[0] * 60;                    // minutes
  return null;
}
