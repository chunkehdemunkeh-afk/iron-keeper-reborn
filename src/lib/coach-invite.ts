/**
 * Coach invite links & codes.
 *
 * A coach shares either a 6-char code or a link (`/join/<CODE>`). The code is
 * stashed locally so it survives the sign-up / OAuth redirect and can be
 * applied during onboarding.
 */
import { STORAGE_KEYS } from "@/lib/storage-keys";

export function normaliseInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

/** Accepts a bare code or a full invite URL and returns the code. */
export function parseInviteInput(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/\/join\/([A-Za-z0-9]{4,10})/);
  return normaliseInviteCode(match ? match[1] : trimmed);
}

export function inviteLinkFor(code: string): string {
  return `${window.location.origin}/join/${code}`;
}

export function setPendingCoachCode(code: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.pendingCoachCode, normaliseInviteCode(code));
  } catch {}
}

export function readPendingCoachCode(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.pendingCoachCode) || null;
  } catch {
    return null;
  }
}

export function clearPendingCoachCode() {
  try {
    localStorage.removeItem(STORAGE_KEYS.pendingCoachCode);
  } catch {}
}
