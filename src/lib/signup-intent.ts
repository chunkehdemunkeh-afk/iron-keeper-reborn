/**
 * Signup intent — remembers whether the person signing up is joining as an
 * athlete or as a coach, so the role can be applied once the session exists
 * (email confirmation and OAuth both return to the app on a fresh page load).
 */
import { STORAGE_KEYS } from "@/lib/storage-keys";

export type AccountType = "athlete" | "coach";

export function setSignupIntent(type: AccountType) {
  try {
    localStorage.setItem(STORAGE_KEYS.signupIntent, type);
  } catch {}
}

export function readSignupIntent(): AccountType | null {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.signupIntent);
    return v === "coach" || v === "athlete" ? v : null;
  } catch {
    return null;
  }
}

export function clearSignupIntent() {
  try {
    localStorage.removeItem(STORAGE_KEYS.signupIntent);
  } catch {}
}

/**
 * Applies a pending "coach" signup intent to the signed-in user.
 * Safe to call on every sign-in: it no-ops without a pending coach intent and
 * `become_coach()` is idempotent.
 */
export async function applyPendingSignupIntent(): Promise<boolean> {
  const intent = readSignupIntent();
  if (intent !== "coach") {
    if (intent) clearSignupIntent();
    return false;
  }
  const { becomeCoach } = await import("@/lib/data/coach-queries");
  const { error } = await becomeCoach();
  if (error) return false;
  clearSignupIntent();
  return true;
}
