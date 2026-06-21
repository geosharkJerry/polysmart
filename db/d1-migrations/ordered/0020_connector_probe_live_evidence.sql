PRAGMA foreign_keys = ON;

ALTER TABLE connector_probe_logs
  ADD COLUMN credentials_configured INTEGER NOT NULL DEFAULT 0;

ALTER TABLE connector_probe_logs
  ADD COLUMN kyc_satisfied INTEGER NOT NULL DEFAULT 0;

ALTER TABLE connector_probe_logs
  ADD COLUMN query_permission_ok INTEGER NOT NULL DEFAULT 0;

ALTER TABLE connector_probe_logs
  ADD COLUMN trade_permission_ok INTEGER NOT NULL DEFAULT 0;

ALTER TABLE connector_probe_logs
  ADD COLUMN rate_limit_ok INTEGER NOT NULL DEFAULT 0;

ALTER TABLE connector_probe_logs
  ADD COLUMN rate_limit_window_ms INTEGER NOT NULL DEFAULT 0;

ALTER TABLE connector_probe_logs
  ADD COLUMN probe_source TEXT NOT NULL DEFAULT 'MOCK'
  CHECK (probe_source IN ('LIVE_API', 'MOCK'));

CREATE INDEX IF NOT EXISTS idx_connector_probe_logs_live_evidence
  ON connector_probe_logs(platform, mode, healthy, credentials_configured, kyc_satisfied, query_permission_ok, trade_permission_ok, rate_limit_ok, created_at DESC);
