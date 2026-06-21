PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  account_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('polymarket', 'kalshi', 'predictit')),
  label TEXT NOT NULL,
  proxy_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'disabled')),
  kyc_status TEXT NOT NULL CHECK (kyc_status IN ('verified', 'pending', 'rejected')),
  external_account_ref TEXT,
  wallet_address TEXT,
  wallet_chain TEXT NOT NULL CHECK (wallet_chain IN ('polygon', 'ethereum', 'base', 'manual')),
  funding_asset TEXT NOT NULL CHECK (funding_asset IN ('USDC', 'USDT', 'USD', 'POINTS')),
  wallet_balance REAL NOT NULL DEFAULT 0,
  funding_threshold_usd REAL NOT NULL DEFAULT 0,
  can_trade INTEGER NOT NULL DEFAULT 1,
  can_query INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  last_sync_at TEXT NOT NULL,
  last_health_check_at TEXT NOT NULL,
  last_funding_sync_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_credentials (
  account_id TEXT PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('polymarket', 'kalshi', 'predictit')),
  encrypted_payload TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  key_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_permission_audits (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('FUNDING_SYNC', 'ADMIN_OVERRIDE')),
  can_trade INTEGER NOT NULL,
  can_query INTEGER NOT NULL,
  granted_permissions_json TEXT NOT NULL,
  wallet_balance REAL NOT NULL,
  funding_threshold_usd REAL NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_binding_events (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  created_by TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
