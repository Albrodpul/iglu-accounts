"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push-client";

export function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
