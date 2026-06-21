PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS connector_probe_logs (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('polymarket', 'kalshi', 'predictit')),
  mode TEXT NOT NULL CHECK (mode IN ('mock', 'live')),
  healthy INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  message TEXT NOT NULL,
  bound_account_count INTEGER NOT NULL,
  verified_account_count INTEGER NOT NULL,
  query_enabled_count INTEGER NOT NULL,
  trade_enabled_count INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_connector_probe_logs_platform_created
  ON connector_probe_logs(platform, created_at DESC);
