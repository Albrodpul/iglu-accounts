-- Remove has_dca column from investment_types (no longer used)
ALTER TABLE investment_types DROP COLUMN IF EXISTS has_dca;
