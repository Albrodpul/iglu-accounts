"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTHS } from "@/lib/format";

type Props = {
  month: number;
  year: number;
  basePath?: string;
};

export function MonthSelector({ month, year, basePath = "/expenses" }: Props) {
  const router = useRouter();

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

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/80 p-1.5 backdrop-blur-sm">
      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigate(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[124px] text-center text-sm font-semibold">
        {MONTHS[month - 1]} {year}
      </span>
      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigate(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
