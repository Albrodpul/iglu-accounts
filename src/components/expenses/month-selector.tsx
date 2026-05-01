"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { MONTHS } from "@/lib/format";

type Props = {
  month?: number | null;
  year?: number | null;
  nullable?: boolean;
  basePath?: string;
  availablePeriods?: { year: number; months: number[] }[];
};

type View = "closed" | "months" | "years";

export function MonthSelector({ month, year, nullable = false, basePath = "/expenses", availablePeriods }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<View>("closed");
  const now = new Date();
  const [browsingYear, setBrowsingYear] = useState(year ?? now.getFullYear());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setView("closed");
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentYear = year ?? now.getFullYear();

  // Build available years list
  const years = availablePeriods
    ? [...new Set([...availablePeriods.map((p) => p.year), currentYear])].sort((a, b) => b - a)
    : [currentYear];

  function hasMonth(y: number, m: number): boolean {
    if (!availablePeriods) return true;
    const p = availablePeriods.find((p) => p.year === y);
    return p ? p.months.includes(m) : false;
  }

  function navigate(direction: -1 | 1) {
    if (!month || !year) return;
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    startTransition(() => router.push(`${basePath}?month=${newMonth}&year=${newYear}`));
  }

  function goTo(m: number, y: number) {
    startTransition(() => router.push(`${basePath}?month=${m}&year=${y}`));
    setView("closed");
  }

  function clearMonth() {
    startTransition(() => router.push(basePath));
    setView("closed");
  }

  function toggleDropdown() {
    if (view === "closed") {
      setBrowsingYear(currentYear);
      setView("months");
    } else {
      setView("closed");
    }
  }

  function selectYear(y: number) {
    setBrowsingYear(y);
    setView("months");
  }

  const hasSelection = nullable && month != null && year != null;
  const noSelection = nullable && (month == null || year == null);

  return (
    <>
    {isPending && typeof document !== "undefined" && createPortal(
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5 overflow-hidden bg-border/40">
        <div className="absolute h-full w-1/3 bg-primary [animation:nav-progress_1s_ease-in-out_infinite]" />
      </div>,
      document.body,
    )}
    <div ref={ref} className={`relative shrink-0 transition-opacity ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/80 p-1.5 backdrop-blur-sm">
        {!noSelection && (
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <button
          onClick={toggleDropdown}
          className="flex min-w-[110px] items-center justify-center gap-1 text-sm font-semibold cursor-pointer hover:text-primary transition-colors"
        >
          {noSelection ? "Todos los meses" : `${MONTHS[month! - 1].substring(0, 3)} ${year}`}
          <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${view !== "closed" ? "rotate-90" : ""}`} />
        </button>
        {hasSelection && (
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" onClick={clearMonth} title="Ver todos">
            <X className="h-4 w-4" />
          </Button>
        )}
        {!noSelection && (
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-md" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {view !== "closed" && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[240px] rounded-lg border border-border bg-card shadow-lg">
          {/* Header with year navigation */}
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
            <button
              onClick={() => setBrowsingYear((y) => y - 1)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView(view === "years" ? "months" : "years")}
              className="text-sm font-semibold hover:text-primary transition-colors cursor-pointer"
            >
              {view === "years" ? "Seleccionar año" : browsingYear}
            </button>
            <button
              onClick={() => setBrowsingYear((y) => y + 1)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="p-2">
            {view === "months" ? (
              <div className="grid grid-cols-3 gap-1">
                {nullable && (
                  <button
                    onClick={clearMonth}
                    className={`col-span-3 mb-1 rounded-md px-2 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      noSelection ? "bg-primary text-primary-foreground" : "hover:bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    Todos los meses
                  </button>
                )}
                {MONTHS.map((m, i) => {
                  const available = hasMonth(browsingYear, i + 1);
                  const isCurrent = i + 1 === month && browsingYear === year;
                  return (
                    <button
                      key={i}
                      onClick={() => goTo(i + 1, browsingYear)}
                      disabled={!available && !isCurrent}
                      className={`rounded-md px-2 py-2 text-xs font-medium transition-colors cursor-pointer ${
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
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => selectYear(y)}
                    className={`rounded-md px-2 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      y === year
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
