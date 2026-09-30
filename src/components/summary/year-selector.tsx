"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  year: number;
  availableYears?: number[];
};

export function YearSelector({ year, availableYears }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
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
    // Keep the other params (e.g. the active `view`) when changing year.
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(y));
    startTransition(() => router.push(`/summary?${params.toString()}`));
    setOpen(false);
  }

  return (
    <div ref={ref} className={`relative shrink-0 transition-opacity ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-card p-1 shadow-xs">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          aria-label="Año anterior"
          onClick={() => goTo(year - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={() => setOpen(!open)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Elegir año (${year})`}
          className="flex min-w-[64px] items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-base font-bold tabular-nums cursor-pointer transition-colors hover:bg-muted/60"
        >
          {year}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          aria-label="Año siguiente"
          onClick={() => goTo(year + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <div className="absolute right-0 md:right-auto md:left-1/2 md:-translate-x-1/2 top-full z-50 mt-2 w-[220px] rounded-xl border border-border bg-card shadow-lg">
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
