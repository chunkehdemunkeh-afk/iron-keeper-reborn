export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

/**
 * Add new entries at the TOP of this array.
 * The first entry is treated as the "latest" release.
 * Keep it short — 3-6 bullet points per release.
 */
export const changelog: ChangelogEntry[] = [
  {
    version: "1.6.120",
    date: "2026-06-13",
    title: "Updates & Fixes",
    changes: [
      "Docs: update PLAN.md with MEV programme update (2026-06-13)",
    ],
  },
  {
    version: "1.6.116",
    date: "2026-05-28",
    title: "Updates & Fixes",
    changes: [
      "Feat: show rest reason in timer label",
    ],
  },
  {
    version: "1.6.110",
    date: "2026-05-17",
    title: "Updates & Fixes",
    changes: [
      "Feat: explain MEV/MAV/MRV in volume detail sheet",
    ],
  },
  {
    version: "1.6.105",
    date: "2026-05-16",
    title: "Updates & Fixes",
    changes: [
      "Feat: add Upper/Lower A/B DUP split; fix substitute exercise name display and strain metric",
    ],
  },
  {
    version: "1.6.104",
    date: "2026-05-14",
    title: "Updates & Fixes",
    changes: [
      "Fix gamification gaps: wire missing XP sources, season RP, duels identity, quests seed",
    ],
  },
  {
    version: "1.6.103",
    date: "2026-05-12",
    title: "Updates & Fixes",
    changes: [
      "Refactor: centralize query keys, split cloud-data, add custom hooks, extract utils",
    ],
  },
  {
    version: "1.6.97",
    date: "2026-05-11",
    title: "Updates & Fixes",
    changes: [
      "Track biometric deployment steps in PLAN.md",
    ],
  },
  {
    version: "1.6.94",
    date: "2026-05-09",
    title: "Updates & Fixes",
    changes: [
      "Refine leaderboard: cumulative volume, true max reps, 1RM improvements, trend arrows",
    ],
  },
  {
    version: "1.6.87",
    date: "2026-04-24",
    title: "Updates & Fixes",
    changes: [
      "Document native app feature backlog (Capacitor, HealthKit, steps, push)",
    ],
  },
  {
    version: "1.6.84",
    date: "2026-04-23",
    title: "Updates & Fixes",
    changes: [
      "Map all custom exercises to free-exercise-db start/finish JPEGs",
    ],
  },
  {
    version: "1.6.79",
    date: "2026-04-22",
    title: "Updates & Fixes",
    changes: [
      "What's New popup now shows real Lovable changes instead of generic wording",
      "Multiple updates on the same day merge into one changelog entry",
      "Filtered out placeholder commit messages so only meaningful changes appear",
      "Double bilateral dumbbell weight in strength standards; add per-DB hint in session",
      "Auto-scroll diagram into view when tapping a muscle row in Recovery tab",
    ],
  },
  {
    version: "1.6.75",
    date: "2026-04-22",
    title: "1RM Test Sets",
    changes: [
      "New 1RM button on every exercise — log a real 1-rep max attempt",
      "True 1RM singles now beat Epley estimates for tier placement",
      "Test 1RM shortcut on each lift in the Strength Level card",
      "PR celebration shows 'True 1RM!' for max attempts",
    ],
  },
  {
    version: "1.6.73",
    date: "2026-04-22",
    title: "Beginner Strength Tier",
    changes: [
      "Added Beginner tier between Untrained and Novice in Strength Standards",
    ],
  },
  {
    version: "1.6.68",
    date: "2026-04-21",
    title: "Updates & Fixes",
    changes: [
      "Improve BodyDiagram muscle path coverage and anatomical accuracy",
    ],
  },
  {
    version: "1.6.63",
    date: "2026-04-20",
    title: "Updates & Fixes",
    changes: [
      "Fix duplicate Progress entry and tidy Key data flow in CLAUDE.md",
    ],
  },
  {
    version: "1.6.52",
    date: "2026-04-18",
    title: "Updates & Fixes",
    changes: [
      "Fix: restore useQueryClient — handleSubmitFeedback was crashing on finish",
    ],
  },
  {
    version: "1.6.37",
    date: "2026-04-17",
    title: "Updates & Fixes",
    changes: [
      "Update CLAUDE.md: font system, git workflow gotcha",
    ],
  },
  {
    version: "1.6.31",
    date: "2026-04-16",
    title: "Updates & Fixes",
    changes: [
      "Add attachment selector for cable and lat machine exercises",
    ],
  },
  {
    version: "1.6.19",
    date: "2026-04-15",
    title: "Progress & Fixes",
    changes: [
      "Daily review tabs now show Weight, Calories, Water, and Total Volume",
      "Fix: iOS CompleteDaySummary footer was cut off on some devices",
      "Fix: Error toast added on save failures to help diagnose issues",
    ],
  },
  {
    version: "1.6.2",
    date: "2026-04-14",
    title: "iOS & Performance",
    changes: [
      "Fix iOS barcode scanning: orientation bugs resolved, faster hit rate",
      "Fix iOS PWA update freeze: app now picks up updates reliably in the background",
      "Profile page version number now links to the changelog",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-04-12",
    title: "Food Tracker",
    changes: [
      "Full food tracker with meal logging and macro tracking",
      "TDEE calculator for personalised calorie goals",
      "Search foods via Open Food Facts database",
      "Barcode scanner for quick food lookup",
      "Manual food entry for custom items",
      "Quick-add from recently logged foods",
      "Daily water intake tracking",
    ],
  },
];

export function getLatestChangelog(): ChangelogEntry | null {
  return changelog[0] ?? null;
}

const SEEN_KEY = "ik-changelog-seen";

export function hasSeenVersion(version: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === version;
  } catch {
    return true;
  }
}

export function markVersionSeen(version: string): void {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch {
    // storage unavailable
  }
}
