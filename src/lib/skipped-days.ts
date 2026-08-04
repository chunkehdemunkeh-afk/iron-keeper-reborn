import { mondayOfWeek } from "@/lib/data/utils";
import { STORAGE_KEYS } from "@/lib/storage-keys";

/**
 * Per-week "skipped" flags for scheduled workout days.
 * Stored as { [weekStart]: workoutId[] } so skips clear automatically
 * at the start of each new week.
 */
type SkipStore = Record<string, string[]>;

function key(userId: string) {
  return `${STORAGE_KEYS.SKIPPED_DAYS}-${userId}`;
}

function read(userId: string): SkipStore {
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as SkipStore) : {};
  } catch {
    return {};
  }
}

function write(userId: string, store: SkipStore) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(store));
  } catch {
    console.warn("Failed to save skipped days");
  }
}

export function currentWeekStart(): string {
  return mondayOfWeek(new Date());
}

/** Workout ids skipped for the current week (older weeks are pruned). */
export function getSkippedWorkoutIds(userId: string): string[] {
  const week = currentWeekStart();
  const store = read(userId);
  return store[week] ?? [];
}

export function isWorkoutSkipped(userId: string, workoutId: string): boolean {
  return getSkippedWorkoutIds(userId).includes(workoutId);
}

/** Toggles the skip flag and returns the new skipped list for this week. */
export function toggleWorkoutSkipped(userId: string, workoutId: string): string[] {
  const week = currentWeekStart();
  const store = read(userId);
  const current = store[week] ?? [];
  const next = current.includes(workoutId)
    ? current.filter((id) => id !== workoutId)
    : [...current, workoutId];
  write(userId, { [week]: next });
  return next;
}
