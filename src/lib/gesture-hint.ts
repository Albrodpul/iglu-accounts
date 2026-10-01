/**
 * Whether to show the "swipe a row" tip. It retires itself: after the user
 * swipes or closes it, or once it has been shown on a few app loads — a tip
 * that never goes away stops being read and starts being noise.
 */
const KEY = "iglu-swipe-hint";
const MAX_LOADS = 5;

let visible: boolean | null = null;
const listeners = new Set<() => void>();

function read(): boolean {
  if (visible !== null) return visible;
  try {
    const stored = localStorage.getItem(KEY);
    const loads = Number(stored) || 0;
    visible = stored !== "done" && loads < MAX_LOADS;
    // Counted once per app load (module state), not per render or navigation.
    if (visible) localStorage.setItem(KEY, String(loads + 1));
  } catch {
    visible = false; // storage unavailable (private mode): don't nag every time
  }
  return visible;
}

export function subscribeGestureHint(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export const gestureHintVisible = read;

export function dismissGestureHint() {
  if (visible === false) return;
  visible = false;
  try {
    localStorage.setItem(KEY, "done");
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

/** Test helper: forget the in-memory decision. */
export function resetGestureHintForTests() {
  visible = null;
}
