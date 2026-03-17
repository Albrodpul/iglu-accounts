"use client";

import { formatCurrency } from "@/lib/format";

type Props = {
  data: { name: string; color: string; icon: string; total: number }[];
};

export function CategoryBreakdown({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-4">
        No hay datos para este periodo
      </p>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total));

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.name} className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-foreground/90">
              {item.icon} {item.name}
            </span>
            <span className="font-semibold tabular-nums">{formatCurrency(item.total)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted/70">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.total / maxTotal) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
