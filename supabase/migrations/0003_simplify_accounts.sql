-- Drop old RLS policies that depend on user_id column
DROP POLICY IF EXISTS "Users can insert own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can view accounts they belong to" ON accounts;
DROP POLICY IF EXISTS "Authenticated users can view accounts they belong to" ON accounts;

-- Now safe to remove unused columns
ALTER TABLE accounts DROP COLUMN IF EXISTS icon;
ALTER TABLE accounts DROP COLUMN IF EXISTS color;
ALTER TABLE accounts DROP COLUMN IF EXISTS is_default;
ALTER TABLE accounts DROP COLUMN IF EXISTS user_id;

-- Recreate RLS policy based on account_members
CREATE POLICY "Authenticated users can view accounts they belong to" ON accounts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM account_members am
      WHERE am.account_id = accounts.id
      AND am.user_id = auth.uid()
    )
  );
