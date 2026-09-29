"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Browser-only values (media queries, localStorage, connectivity) read through
 * `useSyncExternalStore`: correct on the first client render, hydration-safe
 * (the server snapshot is used during SSR) and subscribed to changes — instead
 * of copying them into state from an effect.
 */

export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}

/** Dispatched on same-tab writes; the native `storage` event only fires cross-tab. */
const LOCAL_STORAGE_EVENT = "iglu:local-storage";

export function writeLocalStorage(key: string, value: string): void {
  localStorage.setItem(key, value);
  window.dispatchEvent(new Event(LOCAL_STORAGE_EVENT));
}

function subscribeLocalStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_STORAGE_EVENT, onChange);
  };
}

/** Value of `localStorage[key]`, `null` when missing or during SSR. */
export function useLocalStorageValue(key: string): string | null {
  return useSyncExternalStore(
    subscribeLocalStorage,
    () => localStorage.getItem(key),
    () => null
  );
}

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** `true` while the browser reports no network. Assumes online during SSR. */
export function useIsOffline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => !navigator.onLine,
    () => false
  );
}

const noopSubscribe = () => () => {};

/** One-off client capability check (never changes), `false` during SSR. */
export function useClientCheck(check: () => boolean): boolean {
  return useSyncExternalStore(noopSubscribe, check, () => false);
}
