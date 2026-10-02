import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/push-client", () => ({ registerServiceWorker: vi.fn() }));

import { ServiceWorkerRegister } from "@/components/layout/service-worker-register";

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

/** App goes to the background for `ms`, then comes back. */
function background(ms: number) {
  setHidden(true);
  vi.advanceTimersByTime(ms);
  setHidden(false);
}

beforeEach(() => {
  vi.useFakeTimers();
  refresh.mockClear();
  window.history.replaceState(null, "", "/dashboard");
  render(<ServiceWorkerRegister />);
});

afterEach(() => {
  setHidden(false);
  vi.useRealTimers();
});

describe("refresh when the app comes back to the foreground", () => {
  it("does nothing after a short absence", () => {
    background(10_000);
    vi.advanceTimersByTime(5_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes after a long absence, once the user has been idle for a moment", () => {
    background(10 * 60_000);
    expect(refresh).not.toHaveBeenCalled(); // not straight away: a tap now must stay snappy
    vi.advanceTimersByTime(1_500);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("waits while the user is touching the screen", () => {
    background(10 * 60_000);
    vi.advanceTimersByTime(1_000);
    fireEvent.pointerDown(document.body);
    vi.advanceTimersByTime(1_000);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("skips the refresh if the user already moved to another page", () => {
    background(10 * 60_000);
    window.history.replaceState(null, "", "/expenses"); // tapped a tab: that page loads fresh data itself
    vi.advanceTimersByTime(5_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("drops a pending refresh if the app is hidden again", () => {
    background(10 * 60_000);
    setHidden(true);
    vi.advanceTimersByTime(5_000);
    expect(refresh).not.toHaveBeenCalled();
  });
});
