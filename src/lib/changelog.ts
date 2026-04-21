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
    version: "1.6.64",
    date: "2026-04-21",
    title: "Updates & Fixes",
    changes: [
      "Save plan in Lovable",
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
