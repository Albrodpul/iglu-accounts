"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { setDiscreteMode } from "@/actions/accounts";

type DiscreteModeContextType = {
  discrete: boolean;
  toggle: () => void;
};

// The provider wraps every page that shows money; this default only applies
// outside it (tests, isolated renders), where figures should read as figures.
const DiscreteModeContext = createContext<DiscreteModeContextType>({
  discrete: false,
  toggle: () => {},
});

export function DiscreteModeProvider({
  children,
  initialDiscrete,
}: {
  children: React.ReactNode;
  initialDiscrete: boolean;
}) {
  const [discrete, setDiscrete] = useState(initialDiscrete);

  const toggle = useCallback(async () => {
    const next = !discrete;
    setDiscrete(next);
    try {
      await setDiscreteMode(next);
    } catch {
      // Not saved: back to what the server has, so a reload holds no surprise.
      setDiscrete(!next);
    }
  }, [discrete]);

  return (
    <DiscreteModeContext value={{ discrete, toggle }}>
      {children}
    </DiscreteModeContext>
  );
}

export function useDiscreteMode() {
  return useContext(DiscreteModeContext);
}
