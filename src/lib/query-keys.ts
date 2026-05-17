/**
 * Centralized React Query key registry.
 *
 * Rules:
 * - Always include userId as second element so per-user cache entries are isolated.
 * - Invalidations can drop trailing args to match all sub-keys for a domain
 *   (React Query prefix-matches). e.g. invalidate(["sleep-logs"]) hits all users.
 * - Keep keys in sync with actual queryFn call sites — this is the single source of truth.
 */
export const queryKeys = {
  // ── Workouts ──────────────────────────────────────────────────────────────
  workoutHistory: (userId: string) => ["workout-history", userId] as const,
  workoutVolume: (userId: string) => ["volume-data", userId] as const,
  totalWeightLifted: (userId: string) => ["total-weight-lifted", userId] as const,

  // ── Personal records ──────────────────────────────────────────────────────
  personalRecords: (userId: string) => ["personal-records", userId] as const,
  prTrends: (userId: string) => ["pr-trends", userId] as const,

  // ── Sleep ─────────────────────────────────────────────────────────────────
  sleepLogs: (userId: string, range?: string) =>
    range ? (["sleep-logs", userId, range] as const) : (["sleep-logs", userId] as const),

  // ── Recent sets ───────────────────────────────────────────────────────────
  recentSets: (userId: string) => ["recent-sets", userId] as const,

  // ── Strength profile ──────────────────────────────────────────────────────
  strengthProfile: (userId: string) => ["strength-profile", userId] as const,

  // ── Biometrics ────────────────────────────────────────────────────────────
  /** range: undefined = current day, "14d" = 14-day history, or a YYYY-MM-DD date */
  dailyBiometrics: (userId: string, range?: string) =>
    range ? (["daily-biometrics", userId, range] as const) : (["daily-biometrics", userId] as const),
  /** range: undefined = current day, "14d" = 14-day history, or a YYYY-MM-DD date */
  dailyScores: (userId: string, range?: string) =>
    range ? (["daily-scores", userId, range] as const) : (["daily-scores", userId] as const),

  // ── Activity logs ─────────────────────────────────────────────────────────
  activityLogs: (userId: string) => ["activity-logs", userId] as const,

  // ── Progress photos ───────────────────────────────────────────────────────
  progressPhotos: () => ["progress-photos"] as const,

  // ── Weekly reviews ────────────────────────────────────────────────────────
  weeklyReview: (weekStart: string) => ["weekly-review", weekStart] as const,
  weeklyReviews: () => ["weekly-reviews"] as const,
  weekSummary: (weekStart: string) => ["week-summary", weekStart] as const,

  // ── Calorie burn ──────────────────────────────────────────────────────────
  weeklyBurn: (userId: string, weekStart: string) => ["weekly-burn", userId, weekStart] as const,
  weeklyBurnTrend: (userId: string, mondays: string) =>
    ["weekly-burn-trend", userId, mondays] as const,

  // ── Body measurements ─────────────────────────────────────────────────────
  bodyMeasurements: () => ["body-measurements"] as const,

  // ── Daily logs ────────────────────────────────────────────────────────────
  dailyLogs: (userId: string) => ["daily-logs", userId] as const,
  dailyVolume: (userId: string) => ["daily-volume", userId] as const,

  // ── Food / water tracking ─────────────────────────────────────────────────
  foodLogDates: (userId: string) => ["food-log-dates", userId] as const,
  waterIntakeDates: (userId: string) => ["water-intake-dates", userId] as const,

  // ── Leaderboard ───────────────────────────────────────────────────────────
  leaderboardVisibility: (userId: string) => ["leaderboard-visibility", userId] as const,
  leaderboardTopExercises: (filter: string) => ["leaderboard-top-exercises", filter] as const,
  leaderboard1rm: (exerciseId: string, filter: string) =>
    ["leaderboard-1rm", exerciseId, filter] as const,
  leaderboardMaxWeight: (exerciseId: string, filter: string) =>
    ["leaderboard-max-weight", exerciseId, filter] as const,
  leaderboardMaxReps: (exerciseId: string, filter: string) =>
    ["leaderboard-max-reps", exerciseId, filter] as const,
  leaderboardSessionVolume: (type: string, filter: string) =>
    ["leaderboard-session-volume", type, filter] as const,

  // ── Progression ───────────────────────────────────────────────────────────
  progressions: (userId: string) => ["progressions", userId] as const,
  pendingProgressions: (userId: string) => ["progressions-pending", userId] as const,

  // ── Muscle volume ─────────────────────────────────────────────────────────
  muscleVolume: (userId: string) => ["muscle-volume", userId] as const,
} as const;
