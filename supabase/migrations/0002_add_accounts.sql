-- Accounts table: allows users to have multiple accounts (Casa, Personal, etc.)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🏠',
  color TEXT DEFAULT '#10b981',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user ON accounts (user_id);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view accounts they belong to" ON accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own accounts" ON accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON accounts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add account_id column to expenses (nullable to not break existing data)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_account ON expenses (account_id);

-- Add account_id column to recurring_expenses
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_account ON recurring_expenses (account_id);

-- Account members table: allows sharing accounts with other users (e.g., partner)
CREATE TABLE IF NOT EXISTS account_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, user_id)
);

ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their accounts" ON account_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can manage members" ON account_members
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM account_members am
      WHERE am.account_id = account_members.account_id
      AND am.user_id = auth.uid()
      AND am.role = 'owner'
    )
  );
