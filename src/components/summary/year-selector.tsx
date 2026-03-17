"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  year: number;
};

export function YearSelector({ year }: Props) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/80 p-1.5 backdrop-blur-sm">
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-xl"
        onClick={() => router.push(`/summary?year=${year - 1}`)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[70px] text-center text-sm font-semibold">
        {year}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-xl"
        onClick={() => router.push(`/summary?year=${year + 1}`)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
