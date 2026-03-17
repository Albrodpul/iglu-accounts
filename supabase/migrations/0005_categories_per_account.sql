-- Add account_id to categories so each account has its own categories
ALTER TABLE categories ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

-- Remove the UNIQUE constraint on name (it's now unique per account, not globally)
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE categories ADD CONSTRAINT categories_name_account_unique UNIQUE (name, account_id);

-- Associate all existing categories with the first account found
UPDATE categories
SET account_id = (SELECT id FROM accounts LIMIT 1)
WHERE account_id IS NULL;

-- Make account_id NOT NULL going forward
ALTER TABLE categories ALTER COLUMN account_id SET NOT NULL;

-- Update RLS policies to scope by account membership
DROP POLICY IF EXISTS "Categories are viewable by all authenticated users" ON categories;
DROP POLICY IF EXISTS "Categories are manageable by all authenticated users" ON categories;

CREATE POLICY "Users can view categories for their accounts" ON categories
  FOR SELECT TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage categories for their accounts" ON categories
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
