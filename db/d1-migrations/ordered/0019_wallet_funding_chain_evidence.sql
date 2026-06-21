PRAGMA foreign_keys = ON;

ALTER TABLE wallet_funding
  ADD COLUMN token_decimals INTEGER;

ALTER TABLE wallet_funding
  ADD COLUMN detected_source TEXT NOT NULL DEFAULT 'MANUAL'
  CHECK (detected_source IN ('RPC_SCAN', 'MANUAL'));

ALTER TABLE wallet_funding
  ADD COLUMN rpc_latest_block INTEGER;

ALTER TABLE wallet_funding
  ADD COLUMN scan_from_block INTEGER;

ALTER TABLE wallet_funding
  ADD COLUMN scan_to_block INTEGER;

CREATE INDEX IF NOT EXISTS idx_wallet_funding_chain_evidence
  ON wallet_funding(chain, asset, detected_source, token_decimals, block_number);
