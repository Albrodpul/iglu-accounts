-- Add units field to investment_contributions
-- Stores the exact number of fund units/shares purchased,
-- as reported by the broker. Used instead of deriving units
-- from amount / purchase_price, which can differ due to rounding
-- or commission-adjusted prices.
ALTER TABLE investment_contributions ADD COLUMN units NUMERIC(12,6);
