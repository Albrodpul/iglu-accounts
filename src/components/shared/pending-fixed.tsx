import { Amount } from "@/components/ui/amount";
import { MONTHS } from "@/lib/format";
import { CalendarClock } from "lucide-react";
import type { RecurringExpenseWithCategory } from "@/types";

type Props = {
  /** Fixed movements still due this month, sorted by day. */
  items: (RecurringExpenseWithCategory & { day: number })[];
  month: number;
};

/** What is still going to be charged (or paid in) this month from the fixed movements. */
export function PendingFixed({ items, month }: Props) {
  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const monthName = MONTHS[month - 1].toLowerCase();

  return (
    <section className="surface-card mt-4 px-5 py-4" aria-label="Fijos pendientes este mes">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">Fijos pendientes en {monthName}</h3>
        </div>
        <span className={`text-base font-extrabold tabular-nums ${total >= 0 ? "text-income" : "text-expense"}`}>
          <Amount value={total} />
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2.5 text-sm">
            <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">Día {item.day}</span>
            <span aria-hidden className="shrink-0">{item.category?.icon || "📦"}</span>
            <span className="min-w-0 flex-1 truncate">{item.concept || item.category?.name}</span>
            <span className={`shrink-0 font-semibold tabular-nums ${item.amount >= 0 ? "text-income" : "text-foreground"}`}>
              <Amount value={item.amount} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
