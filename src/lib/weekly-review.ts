// Helpers for the Weekly Review feature.
// Weeks are Monday → Sunday (ISO).

export function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7; // Sunday = 7
  d.setDate(d.getDate() - (day - 1));
  return d;
}

export function getSundayOf(date: Date): Date {
  const monday = getMondayOf(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

export function getCurrentWeekStart(): string {
  return toDateStr(getMondayOf(new Date()));
}

export function getPreviousWeekStart(): string {
  const d = getMondayOf(new Date());
  d.setDate(d.getDate() - 7);
  return toDateStr(d);
}

export function toDateStr(d: Date): string {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
}

export function formatWeekRange(weekStartStr: string): string {
  const start = new Date(weekStartStr + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startFmt = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
  });
  const endFmt = end.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${startFmt} – ${endFmt}`;
}

const PROMPT_KEY = (userId: string, weekStart: string) =>
  `ik-weekly-prompt-dismissed-${userId}-${weekStart}`;

export function isPromptDismissedForCurrentWeek(userId: string): boolean {
  try {
    return !!localStorage.getItem(PROMPT_KEY(userId, getCurrentWeekStart()));
  } catch {
    return false;
  }
}

export function dismissPromptForCurrentWeek(userId: string): void {
  try {
    localStorage.setItem(PROMPT_KEY(userId, getCurrentWeekStart()), "1");
  } catch {
    // ignore
  }
}

export function isPromptDismissedForPreviousWeek(userId: string): boolean {
  try {
    return !!localStorage.getItem(PROMPT_KEY(userId, getPreviousWeekStart()));
  } catch {
    return false;
  }
}

export function dismissPromptForPreviousWeek(userId: string): void {
  try {
    localStorage.setItem(PROMPT_KEY(userId, getPreviousWeekStart()), "1");
  } catch {
    // ignore
  }
}

/**
 * Sunday after 18:00 → show the soft prompt unless dismissed today or
 * a review already exists for the current week.
 */
export function shouldShowSundayPrompt(userId: string, hasCurrentReview: boolean): boolean {
  if (hasCurrentReview) return false;
  const now = new Date();
  const isSunday = now.getDay() === 0;
  const isEvening = now.getHours() >= 18;
  if (!isSunday || !isEvening) return false;
  return !isPromptDismissedForCurrentWeek(userId);
}

/**
 * Mon/Tue catch-up banner if previous week has no review and not dismissed.
 */
export function shouldShowMondayBanner(userId: string, hasPreviousReview: boolean): boolean {
  if (hasPreviousReview) return false;
  const now = new Date();
  const day = now.getDay(); // Mon=1, Tue=2
  if (day !== 1 && day !== 2) return false;
  return !isPromptDismissedForPreviousWeek(userId);
}

// ── Volume summary prompt ────────────────────────────────────────────────────

const VOL_PROMPT_KEY = (userId: string, weekStart: string) =>
  `ik-vol-prompt-dismissed-${userId}-${weekStart}`;

export function isVolumeDismissed(userId: string, weekStart: string): boolean {
  try {
    return !!localStorage.getItem(VOL_PROMPT_KEY(userId, weekStart));
  } catch {
    return false;
  }
}

export function dismissVolumePrompt(userId: string, weekStart: string): void {
  try {
    localStorage.setItem(VOL_PROMPT_KEY(userId, weekStart), "1");
  } catch {
    // ignore
  }
}

/** Sunday after 18:00 — show current week's volume summary. */
export function shouldShowVolumePromptSunday(userId: string): boolean {
  const now = new Date();
  if (now.getDay() !== 0 || now.getHours() < 18) return false;
  return !isVolumeDismissed(userId, getCurrentWeekStart());
}

/** Monday or Tuesday — show previous week's volume summary. */
export function shouldShowVolumePromptMonday(userId: string): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day !== 1 && day !== 2) return false;
  return !isVolumeDismissed(userId, getPreviousWeekStart());
}
