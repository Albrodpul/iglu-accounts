"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { MONTHS } from "@/lib/format";

type Props = {
  month: number;
  year: number;
  basePath?: string;
  availablePeriods?: { year: number; months: number[] }[];
};

export function MonthSelector({ month, year, basePath = "/expenses", availablePeriods }: Props) {
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

  function navigate(direction: -1 | 1) {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    router.push(`${basePath}?month=${newMonth}&year=${newYear}`);
  }

  function goTo(m: number, y: number) {
    router.push(`${basePath}?month=${m}&year=${y}`);
    setOpen(false);
  }

  // Use available periods if provided, otherwise show current year
  const years = availablePeriods
    ? availablePeriods.map((p) => p.year)
    : [year];

  // Ensure current year is included
  if (!years.includes(year)) years.push(year);
  years.sort((a, b) => b - a);

  function hasMonth(y: number, m: number): boolean {
    if (!availablePeriods) return true;
    const p = availablePeriods.find((p) => p.year === y);
    return p ? p.months.includes(m) : false;
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <div className="flex items-center gap-1.5 rounded-2xl border border-border/70 bg-card/80 p-1.5 backdrop-blur-sm">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={() => setOpen(!open)}
          className="flex min-w-[110px] items-center justify-center gap-1 text-sm font-semibold cursor-pointer hover:text-primary transition-colors"
        >
          {MONTHS[month - 1].substring(0, 3)} {year}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => navigate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[280px] rounded-xl border border-border bg-card p-3 shadow-lg">
          {years.map((y) => (
            <div key={y}>
              <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">
                {y}
              </p>
              <div className="grid grid-cols-4 gap-1">
                {MONTHS.map((m, i) => {
                  const available = hasMonth(y, i + 1);
                  const isCurrent = i + 1 === month && y === year;
                  return (
                    <button
                      key={`${y}-${i}`}
                      onClick={() => goTo(i + 1, y)}
                      disabled={!available && !isCurrent}
                      className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : available
                            ? "hover:bg-muted/60 text-foreground"
                            : "text-muted-foreground/30 cursor-default"
                      }`}
                    >
                      {m.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
