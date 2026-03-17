-- Fix infinite recursion: account_members "Owners can manage members" policy
-- references itself causing recursion when other tables query account_members.

-- Drop the recursive policy
DROP POLICY IF EXISTS "Owners can manage members" ON account_members;
DROP POLICY IF EXISTS "Members can view their accounts" ON account_members;

-- Recreate with simple auth.uid() check (no self-reference)
CREATE POLICY "Members can view their own memberships" ON account_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members can manage via direct uid check" ON account_members
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Also fix the categories policies to use a simpler approach
DROP POLICY IF EXISTS "Users can view categories for their accounts" ON categories;
DROP POLICY IF EXISTS "Users can manage categories for their accounts" ON categories;

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

-- Fix accounts policy similarly (it also queries account_members)
DROP POLICY IF EXISTS "Authenticated users can view accounts they belong to" ON accounts;

CREATE POLICY "Authenticated users can view accounts they belong to" ON accounts
  FOR SELECT TO authenticated USING (
    id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  );
