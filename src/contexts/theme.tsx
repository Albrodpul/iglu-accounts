"use client";

import { createContext, useContext, useEffect, useCallback } from "react";
import { useLocalStorageValue, useMediaQuery, writeLocalStorage } from "@/hooks/use-browser-state";

type Theme = "light" | "dark" | "system";

type ThemeContextType = {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
});

const STORAGE_KEY = "iglu-theme";

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

function parseTheme(value: string | null): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The preference lives in localStorage and the OS scheme in a media query;
  // both are read as external stores, so nothing is copied into state.
  const theme = parseTheme(useLocalStorageValue(STORAGE_KEY));
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const resolved: "light" | "dark" = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const setTheme = useCallback((t: Theme) => {
    writeLocalStorage(STORAGE_KEY, t);
  }, []);

  return (
    <ThemeContext value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
