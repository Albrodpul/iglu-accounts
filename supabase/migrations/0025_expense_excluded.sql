-- Movements kept in the journal but left out of every total, summary and
-- balance (e.g. a reimbursed expense, a one-off that would distort a month).
-- Additive: existing rows default to counting, as before.

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS excluded BOOLEAN NOT NULL DEFAULT FALSE;
