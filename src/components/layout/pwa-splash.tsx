"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const SPLASH_MAX_MS = 1600;
const SPLASH_MIN_MS = 500;
const STORAGE_KEY = "iglu:splash:shown";

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;

  const mediaMatch = window.matchMedia?.("(display-mode: standalone)").matches;
  const navigatorStandalone =
    typeof navigator !== "undefined" &&
    "standalone" in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone;

  return Boolean(mediaMatch || navigatorStandalone);
}

export function PwaSplash() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    if (!isStandaloneMode()) return;

    const alreadyShown = window.sessionStorage.getItem(STORAGE_KEY) === "1";
    if (alreadyShown) {
      shownRef.current = true;
      return;
    }

    shownRef.current = true;
    const showTimer = window.setTimeout(() => {
      setVisible(true);
    }, 0);
    const startedAt = Date.now();

    const hide = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);
      window.setTimeout(() => {
        setVisible(false);
        window.sessionStorage.setItem(STORAGE_KEY, "1");
      }, remaining);
    };

    const hardTimeout = window.setTimeout(hide, SPLASH_MAX_MS);
    const softTimeout = window.setTimeout(hide, 900);

    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", hide, { once: true });
    }

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hardTimeout);
      window.clearTimeout(softTimeout);
      window.removeEventListener("load", hide);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(126,200,240,0.22),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(45,126,181,0.16),transparent_36%),linear-gradient(180deg,#f8fcff_0%,#f0f6fb_100%)] transition-opacity duration-300">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-sky-100 bg-white/80 px-8 py-7 shadow-lg backdrop-blur-sm">
        <Image src="/iglu.svg" alt="Iglu" width={72} height={72} priority />
        <p className="text-sm font-semibold tracking-wide text-sky-900">Iglu Management</p>
      </div>
    </div>
  );
}
