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
export async function applyPendingSignupIntent(createdAt?: string): Promise<boolean> {
  const intent = readSignupIntent();
  // Only promote brand-new accounts: the intent may also be set by an OAuth
  // sign-in from an existing athlete, which must never change their role.
  const isNewAccount = createdAt
    ? Date.now() - new Date(createdAt).getTime() < 5 * 60 * 1000
    : true;
  if (!isNewAccount) {
    clearSignupIntent();
    return false;
  }
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
