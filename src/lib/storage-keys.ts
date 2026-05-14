export const STORAGE_KEYS = {
  checkInDismissed: (date: string) => `ik-checkin-dismissed-${date}`,
  recentFoodSearches: "ik-recent-food-searches",
  homeSummaryView: "ik-home-summary-view",
  onboardingTip: (userId: string) => `ik-onboarding-tip-${userId}`,
  nutritionOnboarding: (userId: string) => `ik-nutrition-onboarding-${userId}`,
  htmlHash: "ik-html-hash",
  liveVersion: "ik-live-version",
  justUpdated: "ik-just-updated",
  autoSaveSession: (workoutId: string) => `ik-session-autosave-${workoutId}`,
  statsBarVolumeWindow: (userId: string) => `ik-statsbar-volwin-${userId}`,
  aiInsightRefreshed: (userId: string, date: string) => `ik-ai-refresh-${userId}-${date}`,
} as const;
