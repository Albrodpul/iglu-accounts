-- Add investments module toggle to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS has_investments BOOLEAN NOT NULL DEFAULT false;

-- Add payment_method to expenses (cash vs bank, only relevant when investments module active)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'bank'
  CHECK (payment_method IN ('bank', 'cash'));

-- Investment types (renta variable, renta fija, fondo monetario, cuenta remunerada, renta mixta, etc.)
CREATE TABLE investment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_investment_types_account ON investment_types (account_id);

ALTER TABLE investment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view investment types for their accounts" ON investment_types
  FOR SELECT TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage investment types for their accounts" ON investment_types
  FOR ALL TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

-- Investment funds (individual funds within a type)
CREATE TABLE investment_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES investment_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  invested_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_investment_funds_account ON investment_funds (account_id);
CREATE INDEX idx_investment_funds_type ON investment_funds (type_id);

ALTER TABLE investment_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view investment funds for their accounts" ON investment_funds
  FOR SELECT TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage investment funds for their accounts" ON investment_funds
  FOR ALL TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

-- Investment contributions (DCA tracking / contribution history)
CREATE TABLE investment_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES investment_funds(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_investment_contributions_fund ON investment_contributions (fund_id);
CREATE INDEX idx_investment_contributions_account ON investment_contributions (account_id);

ALTER TABLE investment_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contributions for their accounts" ON investment_contributions
  FOR SELECT TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage contributions for their accounts" ON investment_contributions
  FOR ALL TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

-- Allow accounts to be updated (for has_investments toggle)
CREATE POLICY "Members can update their accounts" ON accounts
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );
