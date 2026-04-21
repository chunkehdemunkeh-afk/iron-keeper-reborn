import { useEffect, useState } from "react";
import {
  getRecoverySettings,
  type RecoverySettings,
} from "@/lib/recovery-settings";

/**
 * Subscribes to recovery settings changes for the given user.
 * Re-renders the consumer whenever settings are saved (same-tab via
 * CustomEvent, or cross-tab via the native `storage` event).
 */
export function useRecoverySettings(
  userId: string | undefined | null,
): RecoverySettings {
  const [settings, setSettings] = useState<RecoverySettings>(() =>
    getRecoverySettings(userId),
  );

  useEffect(() => {
    setSettings(getRecoverySettings(userId));

    function refresh() {
      setSettings(getRecoverySettings(userId));
    }

    function onStorage(e: StorageEvent) {
      if (!userId) return;
      if (e.key === `ik-recovery-settings-${userId}`) refresh();
    }

    window.addEventListener("ik-recovery-settings-changed", refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("ik-recovery-settings-changed", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);

  return settings;
}
