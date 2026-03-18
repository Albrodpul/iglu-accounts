"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  label: string;
  children: React.ReactNode;
  variant?: "hero" | "card";
};

export function CollapsibleSection({ label, children, variant = "hero" }: Props) {
  const [open, setOpen] = useState(false);

  const buttonColors =
    variant === "hero"
      ? "text-white/60 hover:text-white/90"
      : "text-muted-foreground hover:text-foreground";

  return (
    <div className={variant === "hero" ? "mt-5" : ""}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${buttonColors}`}
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
        />
        {label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
