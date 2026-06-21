PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS platform_config (
  config_key TEXT PRIMARY KEY,
  scrape_frequency_minutes INTEGER NOT NULL,
  alpha_floor REAL NOT NULL,
  hedge_timeout_ms INTEGER NOT NULL,
  emergency_buffer_ratio REAL NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_state (
  snapshot_key TEXT PRIMARY KEY,
  inventory_deviation_pct REAL NOT NULL,
  hedge_latency_ms INTEGER NOT NULL,
  slippage_pct REAL NOT NULL,
  blocked_accounts INTEGER NOT NULL,
  anomaly_score REAL NOT NULL,
  anomaly_flags_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('NORMAL', 'CIRCUIT_BREAKER')),
  reason TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_anchors (
  id TEXT PRIMARY KEY,
  chain TEXT NOT NULL,
  network TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  merkle_root TEXT NOT NULL,
  payload_uri TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings_snapshot (
  id TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS api_capability_status (
  capability_key TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('configured', 'placeholder', 'missing', 'disabled')),
  source_type TEXT NOT NULL,
  resolved_state TEXT NOT NULL,
  checked_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_capability_status (
  capability_key TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('configured', 'placeholder', 'missing', 'disabled')),
  source_type TEXT NOT NULL,
  resolved_state TEXT NOT NULL,
  checked_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ip_rules (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ALLOW', 'DENY')),
  scope TEXT NOT NULL CHECK (scope IN ('admin', 'member', 'api')),
  enabled INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_action_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE SET NULL
);
