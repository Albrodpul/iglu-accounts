-- Add transfer_pair_id to link the two legs of a transfer (bank↔cash)
ALTER TABLE expenses ADD COLUMN transfer_pair_id UUID;

-- Index for fast lookup when deleting paired transfers
CREATE INDEX idx_expenses_transfer_pair ON expenses (transfer_pair_id) WHERE transfer_pair_id IS NOT NULL;
