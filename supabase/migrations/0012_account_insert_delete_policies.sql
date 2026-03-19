-- Allow authenticated users to create new accounts
CREATE POLICY "Authenticated users can insert accounts" ON accounts
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow account owners to delete their accounts
CREATE POLICY "Owners can delete their accounts" ON accounts
  FOR DELETE TO authenticated
  USING (
    id IN (
      SELECT account_id FROM account_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
