"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { heroPillClass } from "@/components/shared/collapsible-section";
import { cn } from "@/lib/utils";

type Section = {
  id: string;
  label: string;
  content: React.ReactNode;
  /** Applied to both the pill and its content, e.g. to hide a section where it is already in sight. */
  className?: string;
};

/**
 * Detail sections of a hero card behind a single row of pills: one opens at a
 * time, so the card stays short and two toggles don't cost two lines.
 */
export function HeroDetails({ sections }: { sections: Section[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (sections.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-expanded={open === section.id}
            onClick={() => setOpen(open === section.id ? null : section.id)}
            className={cn(heroPillClass, section.className)}
          >
            {section.label}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open === section.id && "rotate-180")} />
          </button>
        ))}
      </div>
      {sections.map(
        (section) =>
          open === section.id && (
            <div key={section.id} className={cn("mt-4", section.className)}>
              {section.content}
            </div>
          ),
      )}
    </div>
  );
}
