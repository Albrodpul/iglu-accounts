-- Assign expenses with NULL account_id to the user's first account
UPDATE expenses e
SET account_id = (
  SELECT am.account_id
  FROM account_members am
  WHERE am.user_id = e.user_id
  ORDER BY am.created_at ASC
  LIMIT 1
)
WHERE e.account_id IS NULL;

-- Same for recurring_expenses
UPDATE recurring_expenses r
SET account_id = (
  SELECT am.account_id
  FROM account_members am
  WHERE am.user_id = r.user_id
  ORDER BY am.created_at ASC
  LIMIT 1
)
WHERE r.account_id IS NULL;
