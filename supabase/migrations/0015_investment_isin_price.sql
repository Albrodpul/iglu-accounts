-- Add ISIN field to investment_funds (null = no ISIN, cron will skip these)
ALTER TABLE investment_funds ADD COLUMN isin TEXT;

-- Add toggle: show negative returns or clamp to 0 in the UI
ALTER TABLE investment_funds ADD COLUMN show_negative_returns BOOLEAN NOT NULL DEFAULT true;

-- Add purchase price (value liquidativo) to each contribution for NAV-based return calculation
ALTER TABLE investment_contributions ADD COLUMN purchase_price NUMERIC(12,6);
