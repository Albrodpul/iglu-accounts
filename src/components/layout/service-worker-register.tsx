"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { registerServiceWorker } from "@/lib/push-client";

const STALE_AFTER_MS = 60_000;

export function ServiceWorkerRegister() {
  const router = useRouter();
  const lastActiveRef = useRef<number>(Date.now());

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        lastActiveRef.current = Date.now();
        return;
      }
      const elapsed = Date.now() - lastActiveRef.current;
      if (elapsed > STALE_AFTER_MS) {
        router.refresh();
      }
      lastActiveRef.current = Date.now();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [router]);

  return null;
}
