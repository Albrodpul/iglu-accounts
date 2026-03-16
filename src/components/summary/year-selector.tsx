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
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => router.push(`/summary?year=${year - 1}`)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[60px] text-center">
        {year}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => router.push(`/summary?year=${year + 1}`)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
