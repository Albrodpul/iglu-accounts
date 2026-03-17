-- Make concept optional (nullable) in expenses and recurring_expenses
ALTER TABLE expenses ALTER COLUMN concept DROP NOT NULL;
ALTER TABLE recurring_expenses ALTER COLUMN concept DROP NOT NULL;
