"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type DiscreteModeContextType = {
  discrete: boolean;
  toggle: () => void;
};

const DiscreteModeContext = createContext<DiscreteModeContextType>({
  discrete: false,
  toggle: () => {},
});

const STORAGE_KEY = "iglu-discrete-mode";

export function DiscreteModeProvider({ children }: { children: React.ReactNode }) {
  const [discrete, setDiscrete] = useState(false);

  useEffect(() => {
    setDiscrete(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggle = useCallback(() => {
    setDiscrete((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <DiscreteModeContext value={{ discrete, toggle }}>
      {children}
    </DiscreteModeContext>
  );
}

export function useDiscreteMode() {
  return useContext(DiscreteModeContext);
}
