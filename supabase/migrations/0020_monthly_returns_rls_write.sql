CREATE POLICY "Members can manage monthly returns"
  ON investment_monthly_returns FOR ALL TO authenticated
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
