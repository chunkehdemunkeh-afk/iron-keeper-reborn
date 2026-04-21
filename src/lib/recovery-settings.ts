// User-tunable recovery model settings, stored in localStorage per user.

export type RecoveryModel = "strict" | "balanced" | "flexible";

export interface RecoverySettings {
  /** "strict" = recover more slowly (conservative), "flexible" = recover faster, "balanced" = default. */
  model: RecoveryModel;
  /**
   * 0 = ignore sleep entirely (modifier always 1.0)
   * 1 = full default sleep impact
   * up to 2 = double the impact (good sleep helps more, bad sleep hurts more)
   */
  sleepWeight: number;
}

export const DEFAULT_RECOVERY_SETTINGS: RecoverySettings = {
  model: "balanced",
  sleepWeight: 1,
};

function getKey(userId: string) {
  return `ik-recovery-settings-${userId}`;
}

export function getRecoverySettings(userId: string | undefined | null): RecoverySettings {
  if (!userId) return DEFAULT_RECOVERY_SETTINGS;
  try {
    const raw = localStorage.getItem(getKey(userId));
    if (!raw) return DEFAULT_RECOVERY_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<RecoverySettings>;
    return {
      model: parsed.model ?? DEFAULT_RECOVERY_SETTINGS.model,
      sleepWeight: typeof parsed.sleepWeight === "number"
        ? Math.max(0, Math.min(2, parsed.sleepWeight))
        : DEFAULT_RECOVERY_SETTINGS.sleepWeight,
    };
  } catch {
    return DEFAULT_RECOVERY_SETTINGS;
  }
}

export function saveRecoverySettings(userId: string, settings: RecoverySettings): void {
  try {
    localStorage.setItem(getKey(userId), JSON.stringify(settings));
    // Notify same-tab subscribers (storage event only fires cross-tab).
    window.dispatchEvent(
      new CustomEvent("ik-recovery-settings-changed", { detail: { userId } }),
    );
  } catch {
    console.warn("Failed to save recovery settings");
  }
}

/**
 * Returns a multiplier applied to each muscle's recovery window (RECOVERY_HOURS).
 * Strict = longer windows (slower to clear fatigue),
 * Flexible = shorter windows (faster to recover).
 */
export function recoveryWindowMultiplier(model: RecoveryModel): number {
  switch (model) {
    case "strict":   return 1.25;
    case "flexible": return 0.80;
    case "balanced":
    default:         return 1.0;
  }
}
