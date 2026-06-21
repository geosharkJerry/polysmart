PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('PERFORMANCE', 'SUBSCRIPTION')),
  event_id TEXT NOT NULL,
  traded_volume_usd REAL NOT NULL,
  platform_revenue_usd REAL NOT NULL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commission_settlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  gross_profit_usd REAL NOT NULL,
  commission_rate REAL NOT NULL,
  commission_usd REAL NOT NULL,
  net_payout_usd REAL NOT NULL,
  settlement_frequency TEXT NOT NULL CHECK (settlement_frequency IN ('EVENT_END', 'DAILY', 'WEEKLY')),
  settlement_asset TEXT NOT NULL CHECK (settlement_asset IN ('USDT')),
  locked_usdt_amount REAL NOT NULL,
  lock_status TEXT NOT NULL CHECK (lock_status IN ('LOCKED', 'RELEASED')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SETTLED', 'HELD')),
  created_at TEXT NOT NULL,
  settled_at TEXT,
  settled_by TEXT,
  managed_wallet_address TEXT,
  release_tx_ref TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trade_volume_charges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  intent_id TEXT,
  fill_id TEXT,
  executed_volume_usd REAL NOT NULL,
  fee_rate REAL NOT NULL,
  charged_points REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('CHARGED', 'BYPASSED', 'FAILED', 'HALTED')),
  reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (intent_id) REFERENCES execution_intents(intent_id) ON DELETE SET NULL,
  FOREIGN KEY (fill_id) REFERENCES execution_fills(fill_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS managed_commission_settlements (
  id TEXT PRIMARY KEY,
  commission_id TEXT,
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  commission_usdt REAL NOT NULL,
  settlement_status TEXT NOT NULL,
  settlement_reference TEXT,
  created_at TEXT NOT NULL,
  settled_at TEXT,
  FOREIGN KEY (commission_id) REFERENCES commission_settlements(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settlement_payouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  settlement_id TEXT,
  commission_id TEXT,
  asset TEXT NOT NULL CHECK (asset IN ('USDT', 'USD', 'POINTS')),
  amount REAL NOT NULL,
  destination TEXT,
  tx_ref TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'HELD')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (settlement_id) REFERENCES settlements(id) ON DELETE SET NULL,
  FOREIGN KEY (commission_id) REFERENCES commission_settlements(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS execution_halt_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  intent_id TEXT,
  event_id TEXT,
  halt_reason TEXT NOT NULL,
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (intent_id) REFERENCES execution_intents(intent_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS asset_pool_state (
  pool_key TEXT PRIMARY KEY,
  total_assets_usd REAL NOT NULL,
  liquid_buffer_usd REAL NOT NULL,
  total_shares REAL NOT NULL,
  nav REAL NOT NULL,
  high_watermark_nav REAL NOT NULL,
  emergency_penalty_rate REAL NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pool_members (
  user_id TEXT PRIMARY KEY,
  shares REAL NOT NULL,
  principal_usd REAL NOT NULL,
  pnl_usd REAL NOT NULL,
  high_watermark_nav REAL NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
