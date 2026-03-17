-- Allow day_of_month = 0 to mean "last day of month"
ALTER TABLE recurring_expenses DROP CONSTRAINT IF EXISTS recurring_expenses_day_of_month_check;
ALTER TABLE recurring_expenses ADD CONSTRAINT recurring_expenses_day_of_month_check
  CHECK (day_of_month >= 0 AND day_of_month <= 31);

-- Add schedule_type for flexible scheduling
-- 'monthly' = every month on day_of_month (default, backward compatible)
-- 'last_day' = last day of month
-- 'last_weekday' = last specific weekday of month (day_of_month = 0-6, Mon-Sun)
-- 'bimonthly' = every 2 months on day_of_month
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS schedule_type TEXT NOT NULL DEFAULT 'monthly'
  CHECK (schedule_type IN ('monthly', 'last_day', 'last_weekday', 'bimonthly'));
