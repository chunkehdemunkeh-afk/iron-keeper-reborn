// Demo / Guest Mode session flag
// Backed by sessionStorage so it auto-clears when the tab closes.

const KEY = "ik-demo";
export const DEMO_USER_ID = "demo-user";
export const DEMO_USER_EMAIL = "demo@ironkeeper.app";
export const DEMO_DISPLAY_NAME = "Alex";

export function isDemoMode(): boolean {
  try {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function enterDemo(): void {
  try {
    sessionStorage.setItem(KEY, "1");
    // Seed user preferences so onboarding is skipped
    const prefs = {
      onboardingComplete: true,
      daysPerWeek: 3,
      splitId: "ppl",
      splitName: "Push / Pull / Legs",
      schedule: [
        { label: "Push", workoutId: "push" },
        { label: "Pull", workoutId: "pull" },
        { label: "Legs", workoutId: "legs" },
      ],
    };
    localStorage.setItem(`ik-prefs-${DEMO_USER_ID}`, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function exitDemo(): void {
  try {
    sessionStorage.removeItem(KEY);
    // Clear demo-specific tour progress
    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith("ik-demo-tour-")) sessionStorage.removeItem(k);
    });
  } catch {
    // ignore
  }
}
