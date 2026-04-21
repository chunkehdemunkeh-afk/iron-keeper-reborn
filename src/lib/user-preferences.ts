// Serializable schedule entry — NO icon/LucideIcon functions stored here
export type SavedSplitDay = {
  label: string;
  workoutId: string;
};

export type UserPreferences = {
  onboardingComplete: boolean;
  daysPerWeek: number;
  splitId: string;
  splitName: string;
  schedule: SavedSplitDay[];   // only serializable data
};

function getKey(userId: string) {
  return `ik-prefs-${userId}`;
}

export function getUserPreferences(userId: string): UserPreferences | null {
  try {
    const raw = localStorage.getItem(getKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserPreferences(userId: string, prefs: UserPreferences): void {
  try {
    localStorage.setItem(getKey(userId), JSON.stringify(prefs));
  } catch {
    console.warn("Failed to save user preferences");
  }
}

export function isOnboardingComplete(userId: string): boolean {
  return getUserPreferences(userId)?.onboardingComplete === true;
}

/** Returns true if the user chose the Goalkeeper Programme split. */
export function isGKSplit(userId: string): boolean {
  return getUserPreferences(userId)?.splitId === "gk";
}

/** Returns true if the user opted out of having a workout programme. */
export function isNoWorkoutMode(userId: string): boolean {
  return getUserPreferences(userId)?.splitId === "none";
}

/** Returns the ISO date of the Monday of the week containing dateStr. */
function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

/**
 * Calculates the weekly streak: consecutive weeks where the user logged
 * at least `weekGoal` sessions. Rest days within a week do not break it.
 * The current in-progress week is counted only if the goal is already met.
 */
export function computeWeeklyStreak(allDates: Set<string>, weekGoal: number): number {
  const sessionsByWeek = new Map<string, number>();
  allDates.forEach((dateStr) => {
    const wk = getWeekMonday(dateStr);
    sessionsByWeek.set(wk, (sessionsByWeek.get(wk) ?? 0) + 1);
  });

  const now = new Date();
  const currentWeek = getWeekMonday(now.toISOString().split("T")[0]);
  let streak = 0;

  for (let w = 0; w < 104; w++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() - w * 7);
    const wk = getWeekMonday(checkDate.toISOString().split("T")[0]);
    const sessions = sessionsByWeek.get(wk) ?? 0;

    if (wk === currentWeek) {
      // Current in-progress week: only count if already hit the target
      if (sessions >= weekGoal) streak++;
      continue; // always check prior weeks regardless
    }
    if (sessions >= weekGoal) {
      streak++;
    } else {
      break; // missed a past week — streak ends here
    }
  }

  return streak;
}

/**
 * Given the user's schedule and their workout history (most-recent first),
 * returns the next SavedSplitDay they should do.
 */
export function getNextSplitDay(
  schedule: SavedSplitDay[],
  recentWorkoutIds: string[]
): { next: SavedSplitDay; nextIndex: number } {
  if (schedule.length === 0) return { next: schedule[0], nextIndex: 0 };

  for (const workoutId of recentWorkoutIds) {
    const doneIndex = schedule.findIndex((d) => d.workoutId === workoutId);
    if (doneIndex !== -1) {
      const nextIndex = (doneIndex + 1) % schedule.length;
      return { next: schedule[nextIndex], nextIndex };
    }
  }

  // Nothing in history matches — start from the beginning
  return { next: schedule[0], nextIndex: 0 };
}
