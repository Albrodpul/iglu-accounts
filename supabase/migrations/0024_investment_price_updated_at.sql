-- When each fund's price came out, with the time:
--   tickers → the time of the quote itself (Yahoo market time, pre/post included);
--   funds   → when a NAV for a new day first reached the app (sources only give
--             the day, so this is accurate to the hourly update).
-- Additive and nullable: filled by the next update that brings a new price.

ALTER TABLE investment_funds
  ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ DEFAULT NULL;
