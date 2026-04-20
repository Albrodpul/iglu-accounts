"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { setDiscreteMode } from "@/actions/accounts";

type DiscreteModeContextType = {
  discrete: boolean;
  toggle: () => void;
};

const DiscreteModeContext = createContext<DiscreteModeContextType>({
  discrete: true,
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
    await setDiscreteMode(next);
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
