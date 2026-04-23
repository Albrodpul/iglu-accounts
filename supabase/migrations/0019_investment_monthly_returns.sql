-- Snapshot of portfolio state taken on day 1 of each month by the monthly-returns cron.
-- Records previous month's totals so we can track evolution over time.
CREATE TABLE investment_monthly_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_invested NUMERIC(12,2) NOT NULL,
  current_value NUMERIC(12,2) NOT NULL,
  return_amount NUMERIC(12,2) NOT NULL,
  return_pct NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, year, month)
);

CREATE INDEX idx_investment_monthly_returns_account ON investment_monthly_returns (account_id);

ALTER TABLE investment_monthly_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view monthly returns"
  ON investment_monthly_returns FOR SELECT TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );
