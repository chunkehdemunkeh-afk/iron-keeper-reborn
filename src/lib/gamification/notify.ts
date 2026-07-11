/**
 * Client wrapper around awardXp that surfaces results via toast/sheet
 * and invalidates react-query caches so the XP bar updates instantly.
 *
 * XP toasts are batched: multiple awards that fire close together
 * (e.g. food log + calorie goal + protein goal) collapse into one
 * summary toast instead of a stack of pop-ups.
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

interface BatchItem {
  source: string;
  xp: number;
  coins: number;
}

let batch: BatchItem[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let batchHaptic = false;
const BATCH_DELAY_MS = 1500;

function flushBatch() {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
  if (batch.length === 0) return;

  const totalXp = batch.reduce((sum, i) => sum + i.xp, 0);
  const totalCoins = batch.reduce((sum, i) => sum + i.coins, 0);
  const labels = Array.from(new Set(batch.map((i) => LABELS[i.source] ?? i.source)));

  const parts: string[] = [];
  if (totalXp > 0) parts.push(`+${totalXp} XP`);
  if (totalCoins > 0) parts.push(`+${totalCoins} 🪙`);

  const title = labels.length === 1 ? labels[0] : "Rewards earned";
  const description = parts.join(" · ");

  toast.success(title, {
    description,
    duration: labels.length > 1 ? 3000 : 2500,
  });

  if (batchHaptic) {
    hapticSuccess();
    batchHaptic = false;
  }

  batch = [];
}

function queueToast(source: string, xp: number, coins: number) {
  batch.push({ source, xp, coins });
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(flushBatch, BATCH_DELAY_MS);
}

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

    // Queue routine XP/coins toast for batching; avoid duplicating badge/level sheets.
    if (result.xp > 0 || result.coins > 0) {
      queueToast(input.source, result.xp, result.coins);
      batchHaptic = true;
    }

    // Level up sheet (milestone — keep as a sheet, not a toast)
    if (result.leveledUp) {
      pendingLevelUp?.(result);
    }

    // Badge unlock sheet (milestone — keep as a sheet; skip per-badge toasts)
    if (result.unlockedBadges.length > 0) {
      pendingBadgeUnlock?.(result);
    }

    return result;
  } catch (e) {
    console.error("awardXpAndNotify failed:", e);
    return null;
  }
}
