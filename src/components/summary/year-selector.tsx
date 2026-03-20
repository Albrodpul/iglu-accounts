"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  year: number;
  availableYears?: number[];
};

export function YearSelector({ year, availableYears }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const years = availableYears && availableYears.length > 0
    ? [...new Set([...availableYears, year])].sort((a, b) => b - a)
    : [year - 1, year, year + 1];

  function goTo(y: number) {
    router.push(`/summary?year=${y}`);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/80 p-1.5 backdrop-blur-sm">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-md"
          onClick={() => goTo(year - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={() => setOpen(!open)}
          className="flex min-w-[55px] items-center justify-center gap-1 text-sm font-semibold cursor-pointer hover:text-primary transition-colors"
        >
          {year}
          <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-md"
          onClick={() => goTo(year + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <div className="absolute right-0 md:right-auto md:left-1/2 md:-translate-x-1/2 top-full z-50 mt-2 w-[220px] rounded-lg border border-border bg-card shadow-lg">
          <div className="grid grid-cols-3 gap-1 p-2.5">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => goTo(y)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  y === year
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted/60 text-foreground"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
