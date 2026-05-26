/**
 * Shared logic for computing the scheduled day of a recurring item within a given month.
 */

function getLastWeekdayOfMonth(year: number, month: number, weekday: number): number {
  // weekday: 0=Monday ... 6=Sunday (our convention)
  // JS Date: 0=Sunday, 1=Monday ... 6=Saturday
  const jsWeekday = weekday === 6 ? 0 : weekday + 1;
  const lastDay = new Date(year, month, 0).getDate();

  for (let d = lastDay; d >= 1; d--) {
    if (new Date(year, month - 1, d).getDay() === jsWeekday) {
      return d;
    }
  }
  return lastDay;
}

type RecurringItem = {
  id: string;
  schedule_type: string | null;
  day_of_month: number | null;
  expense_schedule_type?: string | null;
  expense_day_of_month?: number | null;
  created_at: string;
};

function resolveDayOfMonth(scheduleType: string, dayOfMonth: number | null, year: number, month: number): number {
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  switch (scheduleType) {
    case "last_day":
      return lastDayOfMonth;
    case "last_weekday":
      return getLastWeekdayOfMonth(year, month, dayOfMonth ?? 4);
    case "bimonthly":
    case "monthly":
    default:
      return Math.min(dayOfMonth || 1, lastDayOfMonth);
  }
}

/**
 * Returns the day-of-month (1-31) this recurring item should be inserted,
 * or `null` if it should be skipped this month (e.g. bimonthly off-month).
 */
export function getScheduledDay(item: RecurringItem, year: number, month: number): number | null {
  const scheduleType = item.schedule_type || "monthly";

  if (scheduleType === "bimonthly") {
    const createdMonth = new Date(item.created_at).getMonth() + 1;
    if (month % 2 !== createdMonth % 2) return null;
  }

  return resolveDayOfMonth(scheduleType, item.day_of_month, year, month);
}

/**
 * Returns the day-of-month (1-31) to stamp on the materialized expense.
 * Uses the `expense_*` override fields when set; otherwise falls back to the scheduled trigger day.
 */
export function getExpenseDay(item: RecurringItem, year: number, month: number): number {
  if (item.expense_schedule_type) {
    return resolveDayOfMonth(item.expense_schedule_type, item.expense_day_of_month ?? null, year, month);
  }
  // Fallback: same day as trigger. Schedule is guaranteed not bimonthly-skip here
  // because callers only invoke this for months where getScheduledDay returned non-null.
  return resolveDayOfMonth(item.schedule_type || "monthly", item.day_of_month, year, month);
}
