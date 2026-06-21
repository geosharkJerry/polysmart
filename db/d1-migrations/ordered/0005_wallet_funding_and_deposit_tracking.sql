PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS wallet_funding (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount REAL NOT NULL,
  amount_usd REAL NOT NULL,
  from_address TEXT,
  to_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  block_number INTEGER,
  detected_at TEXT NOT NULL,
  synced_at TEXT NOT NULL,
  granted_permissions_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wallet_addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT,
  chain TEXT NOT NULL,
  asset TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'DISABLED')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS deposit_intents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT,
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  asset TEXT NOT NULL,
  expected_amount REAL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELED')),
  created_at TEXT NOT NULL,
  expires_at TEXT,
  confirmed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS deposit_reconciliation_logs (
  id TEXT PRIMARY KEY,
  deposit_intent_id TEXT,
  wallet_funding_id TEXT,
  tx_hash TEXT,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (deposit_intent_id) REFERENCES deposit_intents(id) ON DELETE SET NULL,
  FOREIGN KEY (wallet_funding_id) REFERENCES wallet_funding(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS member_wallet_balances (
  user_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  asset TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, chain, asset),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
