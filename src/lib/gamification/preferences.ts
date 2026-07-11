import { STORAGE_KEYS } from "@/lib/storage-keys";

export type XpToastMode = "toast" | "silent";

export function getXpToastMode(userId: string): XpToastMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.xpToastMode(userId));
    if (raw === "silent") return "silent";
  } catch {
    // ignore
  }
  return "toast";
}

export function setXpToastMode(userId: string, mode: XpToastMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.xpToastMode(userId), mode);
  } catch {
    console.warn("Failed to save XP toast preference");
  }
}
