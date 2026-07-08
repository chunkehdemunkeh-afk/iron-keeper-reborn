// Local-only goal targets for Hyrox benchmarks. Keyed per-user + benchmark key.

const GOAL_KEY = (userId: string) => `ik-hyrox-goals-${userId}`;
const ALERT_KEY = (userId: string) => `ik-hyrox-goal-alerts-${userId}`;
const HISTORY_KEY = (userId: string) => `ik-hyrox-goal-history-${userId}`;

export type HyroxGoal = {
  /** Target value: seconds for time metric, kg for weight metric. */
  target: number;
  /** ISO date when goal was set. */
  setAt: string;
};

export type HyroxGoalHistoryEntry = {
  target: number;
  setAt: string;
  achievedAt?: string;
  clearedAt?: string;
  /** "achieved" | "replaced" | "cleared" | "active" */
  status: "achieved" | "replaced" | "cleared" | "active";
};

type GoalMap = Record<string, HyroxGoal>;
type AlertMap = Record<string, string>; // benchmarkKey -> ISO date achieved
type HistoryMap = Record<string, HyroxGoalHistoryEntry[]>;

function safeRead<T>(key: string): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function getGoals(userId: string): GoalMap {
  return safeRead<GoalMap>(GOAL_KEY(userId));
}

export function getGoal(userId: string, benchmarkKey: string): HyroxGoal | null {
  return getGoals(userId)[benchmarkKey] ?? null;
}

/** Returns history newest first. */
export function getGoalHistory(userId: string, benchmarkKey: string): HyroxGoalHistoryEntry[] {
  const map = safeRead<HistoryMap>(HISTORY_KEY(userId));
  const entries = map[benchmarkKey] ?? [];
  return [...entries].sort((a, b) => b.setAt.localeCompare(a.setAt));
}

function updateHistory(
  userId: string,
  benchmarkKey: string,
  mutator: (entries: HyroxGoalHistoryEntry[]) => HyroxGoalHistoryEntry[],
) {
  const map = safeRead<HistoryMap>(HISTORY_KEY(userId));
  map[benchmarkKey] = mutator(map[benchmarkKey] ?? []);
  safeWrite(HISTORY_KEY(userId), map);
}

function closeActive(
  entries: HyroxGoalHistoryEntry[],
  status: "replaced" | "cleared",
): HyroxGoalHistoryEntry[] {
  const now = new Date().toISOString();
  return entries.map((e) =>
    e.status === "active" ? { ...e, status, clearedAt: now } : e,
  );
}

export function setGoal(userId: string, benchmarkKey: string, target: number): void {
  const goals = getGoals(userId);
  const now = new Date().toISOString();
  goals[benchmarkKey] = { target, setAt: now };
  safeWrite(GOAL_KEY(userId), goals);
  // Reset alert state so achieving the new goal triggers a fresh alert
  const alerts = safeRead<AlertMap>(ALERT_KEY(userId));
  delete alerts[benchmarkKey];
  safeWrite(ALERT_KEY(userId), alerts);
  // Record in history: close any active, push new active entry
  updateHistory(userId, benchmarkKey, (entries) => [
    ...closeActive(entries, "replaced"),
    { target, setAt: now, status: "active" },
  ]);
}

export function clearGoal(userId: string, benchmarkKey: string): void {
  const goals = getGoals(userId);
  delete goals[benchmarkKey];
  safeWrite(GOAL_KEY(userId), goals);
  updateHistory(userId, benchmarkKey, (entries) => closeActive(entries, "cleared"));
}

/** Fraction of goal achieved, 0..1. */
export function goalProgress(
  best: number | null,
  first: number | null,
  target: number,
  lowerBetter: boolean,
): number {
  if (best === null) return 0;
  const start = first ?? best;
  if (lowerBetter) {
    if (best <= target) return 1;
    if (start <= target) return 1;
    return Math.max(0, Math.min(1, (start - best) / (start - target)));
  } else {
    if (best >= target) return 1;
    if (start >= target) return 1;
    return Math.max(0, Math.min(1, (best - start) / (target - start)));
  }
}

export function isGoalAchieved(
  best: number | null,
  target: number,
  lowerBetter: boolean,
): boolean {
  if (best === null) return false;
  return lowerBetter ? best <= target : best >= target;
}

/** Returns true the first time a goal is achieved (for firing a one-shot alert). */
export function consumeGoalAchievement(
  userId: string,
  benchmarkKey: string,
  achieved: boolean,
): boolean {
  const alerts = safeRead<AlertMap>(ALERT_KEY(userId));
  const already = !!alerts[benchmarkKey];
  if (achieved && !already) {
    const now = new Date().toISOString();
    alerts[benchmarkKey] = now;
    safeWrite(ALERT_KEY(userId), alerts);
    // Stamp the active history entry as achieved
    updateHistory(userId, benchmarkKey, (entries) =>
      entries.map((e) =>
        e.status === "active" ? { ...e, status: "achieved", achievedAt: now } : e,
      ),
    );
    return true;
  }
  if (!achieved && already) {
    // Goal regressed (rare — e.g. goal was changed). Clear so it can fire again.
    delete alerts[benchmarkKey];
    safeWrite(ALERT_KEY(userId), alerts);
  }
  return false;
}

/** Parse "m:ss" or plain seconds into number of seconds. Returns null if invalid. */
export function parseTimeInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [m, s] = trimmed.split(":");
    const mins = parseInt(m, 10);
    const secs = parseInt(s, 10);
    if (isNaN(mins) || isNaN(secs) || secs >= 60 || secs < 0 || mins < 0) return null;
    return mins * 60 + secs;
  }
  const n = parseFloat(trimmed);
  return isNaN(n) || n <= 0 ? null : n;
}

/** Suggested target: shave ~3% off best time, or add ~5% to best weight. */
export function suggestTarget(best: number | null, lowerBetter: boolean): number | null {
  if (best === null) return null;
  return lowerBetter
    ? Math.max(1, Math.round(best * 0.97))
    : Math.round(best * 1.05 * 2) / 2; // nearest 0.5 kg
}
