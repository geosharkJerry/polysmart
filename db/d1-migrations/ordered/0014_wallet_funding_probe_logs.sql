PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS wallet_funding_probe_logs (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  asset TEXT NOT NULL,
  wallet_address TEXT,
  rpc_configured INTEGER NOT NULL,
  token_configured INTEGER NOT NULL,
  rpc_healthy INTEGER NOT NULL,
  latest_block INTEGER,
  token_decimals INTEGER,
  balance_before REAL NOT NULL,
  balance_after REAL NOT NULL,
  detected_transfer_count INTEGER NOT NULL,
  can_trade INTEGER NOT NULL,
  can_query INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'PENDING', 'ERROR')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wallet_funding_probe_logs_account_created
  ON wallet_funding_probe_logs(account_id, created_at DESC);
