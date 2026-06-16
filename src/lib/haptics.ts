/**
 * Haptic feedback utilities for mobile devices.
 * Uses the Vibration API (supported on Android Chrome, some iOS Safari).
 *
 * Light/medium calls are debounced (50 ms cooldown) so rapid taps don't
 * queue overlapping vibrations and drain the motor.
 */

let lastLight = 0;
let lastMedium = 0;
const COOLDOWN_MS = 50;

export function hapticLight() {
  if (!("vibrate" in navigator)) return;
  const now = Date.now();
  if (now - lastLight < COOLDOWN_MS) return;
  lastLight = now;
  navigator.vibrate(10);
}

export function hapticMedium() {
  if (!("vibrate" in navigator)) return;
  const now = Date.now();
  if (now - lastMedium < COOLDOWN_MS) return;
  lastMedium = now;
  navigator.vibrate(25);
}

export function hapticHeavy() {
  if ("vibrate" in navigator) {
    navigator.vibrate(50);
  }
}

export function hapticSuccess() {
  if ("vibrate" in navigator) {
    navigator.vibrate([15, 50, 15]);
  }
}

export function hapticWarning() {
  if ("vibrate" in navigator) {
    navigator.vibrate([30, 30, 30]);
  }
}
