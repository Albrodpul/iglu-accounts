"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  children: React.ReactNode;
  variant?: "hero" | "card";
};

/** Toggle of a detail section on the hero (dark) surface: a quiet pill. */
export const heroPillClass =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white/90 transition-colors hover:bg-white/20 aria-expanded:bg-white/20";

export function CollapsibleSection({ label, children, variant = "hero" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={
          variant === "hero"
            ? heroPillClass
            : "flex w-full cursor-pointer items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        }
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
