/**
 * Short vibration as physical confirmation of a gesture or save. No-op where
 * unsupported (iOS Safari, desktop) — never rely on it as the only feedback.
 */
export function haptic(pattern: number | number[] = 12): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some embedded browsers throw when vibration is blocked by policy.
  }
}
