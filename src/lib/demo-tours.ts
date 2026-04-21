// Tour definitions per route.

export type TourStep = {
  title: string;
  body: string;
};

export type Tour = {
  id: string;
  steps: TourStep[];
};

export const TOURS: Record<string, Tour> = {
  "/": {
    id: "home",
    steps: [
      { title: "Welcome to Iron Keeper 👋", body: "This is your home base. We've pre-loaded 3 weeks of training, nutrition and weight data so you can explore everything." },
      { title: "Your week at a glance", body: "Tap any day in the week strip to view past sessions. Streak, weekly goal and total kg lifted are tracked at the top." },
      { title: "Next session, ready to go", body: "We auto-rotate your split (currently Push / Pull / Legs). Tap a pill to swap, or pick something different from outside your split." },
      { title: "Log your day", body: "Scroll to log nutrition, water and body weight in one tap each. Hit Complete Day to lock in a snapshot." },
    ],
  },
  "/sessions": {
    id: "sessions",
    steps: [
      { title: "Your training programme", body: "Browse every workout in your split. Tap any card to start lifting — the rest timer and set logger handle the rest." },
      { title: "Bring your own", body: "Hit the + button to build a custom workout from a library of 700+ exercises. Drag to reorder, swipe to delete." },
      { title: "Switch your split anytime", body: "Head to Profile → Training Programme to swap to Upper/Lower, 5/3/1, Bro Split or anything else." },
    ],
  },
  "/workout": {
    id: "workout",
    steps: [
      { title: "Tap a set to log it", body: "Punch in reps and weight. We pre-fill last session's numbers so all you do is overwrite if needed." },
      { title: "Long-press to swap", body: "No barbell? Long-press an exercise to pick a substitute that hits the same muscle." },
      { title: "Rest timer auto-starts", body: "After every completed set the rest timer kicks in. Adjust the duration in the timer popup." },
      { title: "Add anything mid-session", body: "Tap Add Exercise to bring in extras from the library. Swipe left to remove anything you skip." },
    ],
  },
  "/nutrition": {
    id: "nutrition",
    steps: [
      { title: "Search or scan", body: "Tap a meal to search foods, scan a barcode, or pick from your favourites. Macros and calories update live." },
      { title: "Copy yesterday's meal", body: "Eat the same lunch every day? Use the Copy icon on any meal to duplicate it from the past 7 days." },
      { title: "Hit your water goal", body: "Tap + on the water tracker for each glass. Daily summary shows up on the home screen too." },
      { title: "Lock in your day", body: "Tap Complete Day at the top to save a snapshot of your nutrition. It feeds the Progress charts." },
    ],
  },
  "/progress": {
    id: "progress",
    steps: [
      { title: "Two views, your call", body: "Stats shows volume, frequency and your nutrition trends. PRs lists every personal record by exercise." },
      { title: "Swipe a PR left to delete", body: "Made a typo? Swipe a PR row to remove it. The next-best set automatically becomes your new record." },
      { title: "Compare weeks & months", body: "Tap the period buttons to switch between week, month and year — and toggle metrics like calories or body weight." },
    ],
  },
  "/profile": {
    id: "profile",
    steps: [
      { title: "Make it yours", body: "Tap your avatar to upload a photo, or pencil-edit your name. Everything syncs across devices." },
      { title: "Switch your training split", body: "Pick from 9 built-in programmes or build a custom one. Onboarding can be re-run anytime from Settings." },
      { title: "Exit demo when you're done", body: "Demo data lives only in this tab. Hit Exit Demo at the top to sign up and keep your real progress." },
    ],
  },
  "/body": {
    id: "body",
    steps: [
      { title: "Track the trend, not the day", body: "Log body weight and body fat % whenever you weigh in. The chart smooths out the daily noise so you can see real progress." },
      { title: "One tap to log", body: "Hit Log at the top, punch in a number, add an optional note (e.g. 'post-holiday') and save. Everything syncs to your account." },
      { title: "Latest stats at a glance", body: "Your most recent weight and body fat live above the log so you always know your starting point for the week." },
    ],
  },
  "/builder": {
    id: "builder",
    steps: [
      { title: "Build your own workout", body: "Pick a name, emoji and colour, then add exercises from a pool of 700+ — including everything from your split and the full library." },
      { title: "Drag to reorder, swipe to delete", body: "Use the grip handle to rearrange exercises. Swipe any row left to remove it. Sets and reps are editable inline." },
      { title: "Save and start straight away", body: "Hit Save to add it to your Sessions list, or Save & Start to jump into the first set immediately." },
    ],
  },
  "/history": {
    id: "history",
    steps: [
      { title: "Every session you've crushed", body: "Tap any day on the calendar to see the workouts you logged. Coloured dots = completed sessions." },
      { title: "Filter by workout type", body: "Use the chips above the calendar to focus on Push, Pull, Legs or any other workout. The summary cards update live." },
      { title: "Export your data anytime", body: "Tap CSV to download a workout-level export, or Sets for the full set-by-set breakdown — perfect for spreadsheet nerds." },
    ],
  },
};

export function getTourForPath(pathname: string): Tour | null {
  if (pathname.startsWith("/workout/")) return TOURS["/workout"];
  return TOURS[pathname] ?? null;
}
