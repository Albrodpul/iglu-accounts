"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

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

  return (
    <div ref={ref} className="relative shrink-0">
      <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/80 p-1.5 backdrop-blur-sm">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => router.push(`/summary?year=${year - 1}`)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={() => setOpen(!open)}
          className="flex min-w-[55px] items-center justify-center gap-1 text-sm font-semibold cursor-pointer hover:text-primary transition-colors"
        >
          {year}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => router.push(`/summary?year=${year + 1}`)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 rounded-xl border border-border bg-card p-2 shadow-lg">
          <div className="flex flex-col gap-0.5">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => {
                  router.push(`/summary?year=${y}`);
                  setOpen(false);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
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
