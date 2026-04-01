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
  created_at: string;
};

/**
 * Returns the day-of-month (1-31) this recurring item should be inserted,
 * or `null` if it should be skipped this month (e.g. bimonthly off-month).
 */
export function getScheduledDay(item: RecurringItem, year: number, month: number): number | null {
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const scheduleType = item.schedule_type || "monthly";

  if (scheduleType === "bimonthly") {
    const createdMonth = new Date(item.created_at).getMonth() + 1;
    if (month % 2 !== createdMonth % 2) return null;
  }

  switch (scheduleType) {
    case "last_day":
      return lastDayOfMonth;
    case "last_weekday":
      return getLastWeekdayOfMonth(year, month, item.day_of_month ?? 4);
    case "bimonthly":
    case "monthly":
    default:
      return Math.min(item.day_of_month || 1, lastDayOfMonth);
  }
}
