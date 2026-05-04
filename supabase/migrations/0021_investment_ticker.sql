-- Add ticker symbol column to investment_funds for individual stock price tracking.
-- ticker = Yahoo Finance symbol (e.g. ITX.MC, AAPL, SAN.MC).
-- When ticker is set, the NAV cron uses Yahoo Finance instead of fundinfo.com.

ALTER TABLE investment_funds
  ADD COLUMN IF NOT EXISTS ticker VARCHAR(20) DEFAULT NULL;
