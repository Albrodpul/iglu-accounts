"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerServiceWorker } from "@/lib/push-client";

/** Coming back after this long in the background, the data on screen may be old. */
const STALE_AFTER_MS = 60_000;
/**
 * Quiet time to wait before refreshing. While a refresh is in flight, tapping a
 * tab shows nothing until the server answers — and the first thing people do
 * when they reopen the app is tap. So the refresh waits for a pause, and is
 * dropped if they have already moved to another page (which loads fresh data
 * on its own).
 */
const REFRESH_AFTER_IDLE_MS = 1500;

export function ServiceWorkerRegister() {
  const router = useRouter();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    let hiddenAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pageAtResume = "";

    const currentPage = () => location.pathname + location.search;

    function cancel() {
      clearTimeout(timer);
      timer = undefined;
      window.removeEventListener("pointerdown", postpone, true);
    }

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        cancel();
        if (!document.hidden && currentPage() === pageAtResume) router.refresh();
      }, REFRESH_AFTER_IDLE_MS);
    }

    function postpone() {
      if (timer !== undefined) schedule();
    }

    function handleVisibility() {
      if (document.hidden) {
        hiddenAt = Date.now();
        cancel();
        return;
      }
      if (Date.now() - hiddenAt <= STALE_AFTER_MS) return;
      pageAtResume = currentPage();
      window.addEventListener("pointerdown", postpone, true);
      schedule();
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      cancel();
    };
  }, [router]);

  return null;
}
