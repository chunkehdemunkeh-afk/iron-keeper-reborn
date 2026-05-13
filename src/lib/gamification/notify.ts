/**
 * Client wrapper around awardXp that surfaces results via toast/sheet
 * and invalidates react-query caches so the XP bar updates instantly.
 */

import { toast } from "sonner";
import { queryClient } from "@/lib/query-client";
import { hapticSuccess } from "@/lib/haptics";
import { awardXp, type AwardXpInput, type AwardXpResult } from "./awardXp";

let pendingLevelUp: ((r: AwardXpResult) => void) | null = null;
let pendingBadgeUnlock: ((r: AwardXpResult) => void) | null = null;

/** Subscribe to level-up events (used by LevelUpSheet). */
export function onLevelUp(cb: (r: AwardXpResult) => void): () => void {
  pendingLevelUp = cb;
  return () => {
    if (pendingLevelUp === cb) pendingLevelUp = null;
  };
}

/** Subscribe to badge-unlock events (used by BadgeUnlockSheet). */
export function onBadgeUnlock(cb: (r: AwardXpResult) => void): () => void {
  pendingBadgeUnlock = cb;
  return () => {
    if (pendingBadgeUnlock === cb) pendingBadgeUnlock = null;
  };
}

const LABELS: Record<string, string> = {
  daily_open: "Daily check-in",
  workout: "Workout logged",
  workout_programmed_bonus: "Programmed workout bonus",
  sleep_log: "Sleep logged",
  sleep_log_with_stages: "Sleep stages bonus",
  food_log_any: "Food logged",
  food_log_complete: "Calorie goal hit",
  protein_goal: "Protein goal hit",
  water_goal: "Water goal hit",
  bodyweight: "Bodyweight logged",
  biometric_checkin: "Morning check-in",
  progress_photo: "Progress photo",
  weekly_review: "Weekly review done",
  personal_record: "New PR!",
  first_time_feature: "New feature unlocked",
};

/**
 * Award XP and show user feedback.
 * Failures are swallowed — gamification must never block a successful log.
 */
export async function awardXpAndNotify(input: AwardXpInput): Promise<AwardXpResult | null> {
  try {
    const result = await awardXp(input);
    if (result.skipped) return result;

    // Invalidate progress queries so the XP bar updates
    queryClient.invalidateQueries({ queryKey: ["user-progress"] });
    queryClient.invalidateQueries({ queryKey: ["user-badges"] });
    queryClient.invalidateQueries({ queryKey: ["xp-events"] });

    // Toast for the XP gain
    if (result.xp > 0 || result.coins > 0) {
      const label = LABELS[input.source] ?? "Earned XP";
      const parts: string[] = [];
      if (result.xp > 0) parts.push(`+${result.xp} XP`);
      if (result.coins > 0) parts.push(`+${result.coins} 🪙`);
      toast.success(label, { description: parts.join(" · "), duration: 2500 });
      hapticSuccess();
    }

    // Level up
    if (result.leveledUp) {
      pendingLevelUp?.(result);
    }
    // Badge unlocks
    if (result.unlockedBadges.length > 0) {
      pendingBadgeUnlock?.(result);
      for (const b of result.unlockedBadges) {
        toast.success(`Badge unlocked: ${b.name}`, {
          description: `+${b.xpReward} XP · +${b.coinReward} 🪙`,
          duration: 4000,
        });
      }
    }

    return result;
  } catch (e) {
    console.error("awardXpAndNotify failed:", e);
    return null;
  }
}
