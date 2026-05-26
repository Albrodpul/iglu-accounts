-- Optional override for the expense_date stamped on materialized recurring movements.
-- When null, the materialization date (day_of_month + schedule_type) is used as expense_date.
-- When set, the system inserts the recurring movement on its scheduled trigger date,
-- but stamps expense_date according to these override fields.

ALTER TABLE recurring_expenses
  ADD COLUMN IF NOT EXISTS expense_day_of_month INTEGER
  CHECK (expense_day_of_month IS NULL OR (expense_day_of_month >= 0 AND expense_day_of_month <= 31));

ALTER TABLE recurring_expenses
  ADD COLUMN IF NOT EXISTS expense_schedule_type TEXT
  CHECK (expense_schedule_type IS NULL OR expense_schedule_type IN ('monthly', 'last_day', 'last_weekday'));
