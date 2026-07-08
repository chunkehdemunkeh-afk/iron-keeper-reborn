// Local-only goal targets for Hyrox benchmarks. Keyed per-user + benchmark key.

const GOAL_KEY = (userId: string) => `ik-hyrox-goals-${userId}`;
const ALERT_KEY = (userId: string) => `ik-hyrox-goal-alerts-${userId}`;

export type HyroxGoal = {
  /** Target value: seconds for time metric, kg for weight metric. */
  target: number;
  /** ISO date when goal was set. */
  setAt: string;
};

type GoalMap = Record<string, HyroxGoal>;
type AlertMap = Record<string, string>; // benchmarkKey -> ISO date achieved

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

export function setGoal(userId: string, benchmarkKey: string, target: number): void {
  const goals = getGoals(userId);
  goals[benchmarkKey] = { target, setAt: new Date().toISOString() };
  safeWrite(GOAL_KEY(userId), goals);
  // Reset alert state so achieving the new goal triggers a fresh alert
  const alerts = safeRead<AlertMap>(ALERT_KEY(userId));
  delete alerts[benchmarkKey];
  safeWrite(ALERT_KEY(userId), alerts);
}

export function clearGoal(userId: string, benchmarkKey: string): void {
  const goals = getGoals(userId);
  delete goals[benchmarkKey];
  safeWrite(GOAL_KEY(userId), goals);
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
    alerts[benchmarkKey] = new Date().toISOString();
    safeWrite(ALERT_KEY(userId), alerts);
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
