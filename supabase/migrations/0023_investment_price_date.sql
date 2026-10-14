-- Date of the price behind each fund's current_value, as reported by the source
-- (fundinfo NAV date, Yahoo market time). Funds such as pension plans publish
-- their NAV days late: updated_at says when we looked, this says how fresh it is.
-- Additive and nullable: existing rows simply have no date until the next update.

ALTER TABLE investment_funds
  ADD COLUMN IF NOT EXISTS price_date DATE DEFAULT NULL;
